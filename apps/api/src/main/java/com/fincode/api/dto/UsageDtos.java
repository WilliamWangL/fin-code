package com.fincode.api.dto;

import java.time.LocalDate;

/**
 * Request/response payloads for the API usage reports (FIN-015): request
 * counts, quota, endpoint usage, error rate and latency.
 */
public final class UsageDtos {

    private UsageDtos() {
    }

    /** Quota context for the current calendar month; nulls when unlimited. */
    public record QuotaData(
            String period,
            String plan,
            Integer limit,
            long used,
            Integer remaining) {
    }

    public record UsageSummaryData(
            LocalDate from,
            LocalDate to,
            long requestCount,
            long errorCount,
            double errorRate,
            long avgLatencyMs,
            int maxLatencyMs,
            QuotaData quota) {
    }

    public record EndpointUsageData(
            String endpoint,
            long requestCount,
            long errorCount,
            double errorRate,
            long avgLatencyMs) {
    }

    public record DailyUsageData(
            LocalDate date,
            long requestCount,
            long errorCount,
            long avgLatencyMs) {
    }

    public record ApiKeyUsageData(
            Long apiKeyId,
            long requestCount,
            long errorCount,
            double errorRate,
            long avgLatencyMs) {
    }
}
