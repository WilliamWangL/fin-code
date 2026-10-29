package com.fincode.api.application.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

/**
 * Daily allowance for the anonymous website lookups: one counter per client IP
 * shared by every identifier page, so SWIFT, routing, sort code, BSB, IFSC,
 * CNAPS, BIN and IBAN lookups all draw from the same quota. The key expires at
 * the next UTC midnight, which is also the day boundary the website uses for
 * its own browser-side counter.
 *
 * Redis being unavailable fails open, like the per-minute bucket: a cache
 * outage must not take the public tools down.
 */
@Service
public class DailyLookupQuotaService {

    private static final Logger log = LoggerFactory.getLogger(DailyLookupQuotaService.class);

    private static final String KEY_PREFIX = "quota:lookup:daily:";

    private static final String LUA = """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local ttl = tonumber(ARGV[2])
            local used = redis.call('INCR', key)
            if used == 1 then
              redis.call('PEXPIRE', key, ttl)
            end
            local remaining = limit - used
            if remaining < 0 then remaining = 0 end
            return {used <= limit and 1 or 0, remaining, redis.call('PTTL', key)}
            """;

    private static final DefaultRedisScript<List> ACQUIRE_SCRIPT = new DefaultRedisScript<>(LUA, List.class);

    private final StringRedisTemplate redis;

    public DailyLookupQuotaService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /**
     * Counts one lookup for the client IP. Every anonymous lookup request is
     * counted, including the ones that end in 404 or a validation error, so a
     * visitor cannot probe the dataset for free.
     *
     * @param limit lookups allowed per UTC day; non-positive disables the cap
     */
    public Result acquire(String clientIp, int limit) {
        if (limit <= 0) {
            return Result.unlimited(limit);
        }
        try {
            List<?> raw = redis.execute(ACQUIRE_SCRIPT, List.of(key(clientIp, LocalDate.now(ZoneOffset.UTC))),
                    String.valueOf(limit), String.valueOf(millisUntilNextUtcMidnight()));
            if (raw == null || raw.size() < 3) {
                return Result.unlimited(limit);
            }
            boolean allowed = toLong(raw.get(0)) == 1L;
            int remaining = (int) toLong(raw.get(1));
            long retryAfterMs = allowed ? 0L : Math.max(1000L, toLong(raw.get(2)));
            return new Result(allowed, limit, remaining, retryAfterMs);
        } catch (DataAccessException exception) {
            log.warn("Daily lookup quota unavailable, failing open: {}", exception.getMessage());
            return Result.unlimited(limit);
        }
    }

    /** Redis key of one IP's counter for a UTC day; exposed for tests. */
    public static String key(String clientIp, LocalDate day) {
        return KEY_PREFIX + clientIp + ":" + day;
    }

    private static long millisUntilNextUtcMidnight() {
        Instant now = Instant.now();
        Instant midnight = LocalDate.now(ZoneOffset.UTC).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        return Math.max(1000L, Duration.between(now, midnight).toMillis());
    }

    private static long toLong(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    /**
     * @param limit       the configured daily allowance
     * @param remaining   lookups left after this one
     * @param retryAfterMs milliseconds until the counter resets when rejected
     */
    public record Result(boolean allowed, int limit, int remaining, long retryAfterMs) {

        public static Result unlimited(int limit) {
            return new Result(true, limit, Integer.MAX_VALUE, 0L);
        }
    }
}
