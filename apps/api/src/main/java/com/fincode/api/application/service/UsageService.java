package com.fincode.api.application.service;

import com.fincode.api.domain.model.ApiKey;
import com.fincode.api.domain.model.RequestLog;
import com.fincode.api.domain.repository.RequestLogRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Usage accounting (spec §43, §44, FIN-015): per-request log rows in MySQL and
 * the monthly request quota counter in Redis. Redis failures fail open so
 * usage tracking never blocks traffic.
 */
@Service
public class UsageService {

    private static final Logger log = LoggerFactory.getLogger(UsageService.class);
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("yyyyMM");

    /** Route templates used to normalize logged URIs (FIN-015 reports). */
    private static final List<EndpointRule> ENDPOINT_RULES = List.of(
            new EndpointRule(Pattern.compile("^/v1/banks/search$"), "/v1/banks/search"),
            new EndpointRule(Pattern.compile("^/v1/banks/[^/]+/branches$"), "/v1/banks/{id}/branches"),
            new EndpointRule(Pattern.compile("^/v1/banks/[^/]+$"), "/v1/banks/{id}"),
            new EndpointRule(Pattern.compile("^/v1/countries/[^/]+/iban-format$"), "/v1/countries/{code}/iban-format"),
            new EndpointRule(Pattern.compile("^/v1/countries/[^/]+$"), "/v1/countries/{code}"),
            new EndpointRule(Pattern.compile("^/v1/(swift|routing|sort-code|bsb|ifsc|cnaps)/[^/]+$"), "/v1/$1/{code}"));

    private final RequestLogRepository requestLogRepository;
    private final StringRedisTemplate redis;

    public UsageService(RequestLogRepository requestLogRepository, StringRedisTemplate redis) {
        this.requestLogRepository = requestLogRepository;
        this.redis = redis;
    }

    /** Returns false when the plan's monthly quota is exhausted. */
    public boolean tryConsumeQuota(ApiKey apiKey) {
        int quota = apiKey.getPlan().monthlyQuota();
        if (quota == Integer.MAX_VALUE) {
            return true;
        }
        try {
            String key = "quota:" + apiKey.getId() + ":" + ZonedDateTime.now(ZoneOffset.UTC).format(MONTH_FORMAT);
            Long count = redis.opsForValue().increment(key);
            redis.expire(key, secondsUntilMonthRollover(), TimeUnit.SECONDS);
            return count == null || count <= quota;
        } catch (DataAccessException exception) {
            log.warn("Quota counter unavailable, failing open: {}", exception.getMessage());
            return true;
        }
    }

    public void record(ApiKey apiKey, String endpoint, String method, int statusCode, long responseTimeMs) {
        RequestLog entry = new RequestLog();
        entry.setApiKeyId(apiKey.getId());
        entry.setOrganizationId(apiKey.getOrganizationId());
        entry.setEndpoint(normalizeEndpoint(endpoint));
        entry.setMethod(method);
        entry.setStatusCode(statusCode);
        entry.setResponseTime((int) Math.min(responseTimeMs, Integer.MAX_VALUE));
        entry.setRequestDate(LocalDateTime.now(ZoneOffset.UTC));
        requestLogRepository.save(entry);
    }

    /** Best-effort logging: usage tracking must never break a request. */
    public void recordSafely(ApiKey apiKey, String endpoint, String method, int statusCode, long responseTimeMs) {
        try {
            record(apiKey, endpoint, method, statusCode, responseTimeMs);
        } catch (RuntimeException exception) {
            log.warn("Failed to persist request log: {}", exception.getMessage());
        }
    }

    /**
     * Collapses path parameters to their route template (e.g.
     * {@code /v1/banks/inst_123 -> /v1/banks/{id}}) so FIN-015 endpoint reports
     * group calls to the same route. Results are capped at the column width.
     */
    static String normalizeEndpoint(String uri) {
        String normalized = uri;
        if (normalized != null) {
            for (EndpointRule rule : ENDPOINT_RULES) {
                Matcher matcher = rule.pattern().matcher(normalized);
                if (matcher.matches()) {
                    normalized = matcher.replaceFirst(rule.template());
                    break;
                }
            }
        }
        if (normalized != null && normalized.length() > 120) {
            return normalized.substring(0, 120);
        }
        return normalized;
    }

    private static long secondsUntilMonthRollover() {
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        ZonedDateTime expiry = now.toLocalDate()
                .with(TemporalAdjusters.lastDayOfMonth())
                .plusDays(2)
                .atStartOfDay(ZoneOffset.UTC);
        return Math.max(Duration.between(now, expiry).getSeconds(), 60L);
    }

    private record EndpointRule(Pattern pattern, String template) {
    }
}
