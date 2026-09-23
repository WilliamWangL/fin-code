package com.fincode.api.application.service;

import com.fincode.api.domain.model.ApiKey;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

/**
 * Per-key rate limiting (spec §42, FIN-016): a token bucket kept in Redis.
 * Capacity is the plan's requests-per-minute, refilled continuously. When Redis
 * is unavailable the limiter fails open so the API stays available.
 */
@Service
public class RateLimitService {

    private static final Logger log = LoggerFactory.getLogger(RateLimitService.class);

    /** Anonymous website lookups share the FREE plan's per-minute burst. */
    public static final int ANONYMOUS_CAPACITY_PER_MINUTE = 10;

    private static final String ANONYMOUS_BUCKET_PREFIX = "ratelimit:ip:";

    private static final String LUA = """
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local now = tonumber(ARGV[2])
            local refill = tonumber(ARGV[3])
            local cost = tonumber(ARGV[4])
            local values = redis.call('HMGET', key, 'tokens', 'ts')
            local tokens = tonumber(values[1])
            local ts = tonumber(values[2])
            if tokens == nil or ts == nil then
              tokens = capacity
              ts = now
            end
            local elapsed = now - ts
            if elapsed > 0 then
              tokens = math.min(capacity, tokens + elapsed * refill)
              ts = now
            end
            local allowed = 0
            local retry = 0
            if tokens >= cost then
              tokens = tokens - cost
              allowed = 1
            else
              retry = math.ceil((cost - tokens) / refill)
            end
            redis.call('HSET', key, 'tokens', tostring(tokens), 'ts', tostring(now))
            redis.call('PEXPIRE', key, 120000)
            return {allowed, math.floor(tokens), retry}
            """;

    private static final DefaultRedisScript<List> ACQUIRE_SCRIPT = new DefaultRedisScript<>(LUA, List.class);

    private final StringRedisTemplate redis;

    public RateLimitService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public Result acquire(ApiKey apiKey) {
        int capacity = apiKey.getPlan().requestsPerMinute();
        if (capacity == Integer.MAX_VALUE) {
            return Result.unlimited();
        }
        return acquire("ratelimit:" + apiKey.getId(), capacity);
    }

    /**
     * Anonymous directory lookups from the public website search: a shared
     * per-minute burst keyed by client IP, stricter than any paid plan.
     */
    public Result acquireAnonymous(String clientIp) {
        return acquire(ANONYMOUS_BUCKET_PREFIX + clientIp, ANONYMOUS_CAPACITY_PER_MINUTE);
    }

    private Result acquire(String bucketKey, int capacityPerMinute) {
        long now = System.currentTimeMillis();
        double refillPerMs = capacityPerMinute / 60_000.0;
        try {
            List<?> raw = redis.execute(ACQUIRE_SCRIPT, List.of(bucketKey),
                    String.valueOf(capacityPerMinute), String.valueOf(now), String.valueOf(refillPerMs), "1");
            if (raw == null || raw.size() < 3) {
                return Result.unlimited();
            }
            boolean allowed = toLong(raw.get(0)) == 1L;
            int remaining = (int) toLong(raw.get(1));
            long retryAfterMs = toLong(raw.get(2));
            return new Result(allowed, remaining, retryAfterMs);
        } catch (DataAccessException exception) {
            log.warn("Rate limiter unavailable, failing open: {}", exception.getMessage());
            return Result.unlimited();
        }
    }

    private static long toLong(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    /** @param retryAfterMs milliseconds until the next token when rejected. */
    public record Result(boolean allowed, int remaining, long retryAfterMs) {

        public static Result unlimited() {
            return new Result(true, Integer.MAX_VALUE, 0);
        }
    }
}
