package com.fincode.api.domain.enums;

/**
 * Subscription plans and their rate limits / quotas (spec §42, §43).
 */
public enum Plan {
    FREE(10, 100),
    DEVELOPER(60, 10_000),
    STARTUP(300, 50_000),
    BUSINESS(1_000, 500_000),
    ENTERPRISE(Integer.MAX_VALUE, Integer.MAX_VALUE);

    private final int requestsPerMinute;
    private final int monthlyQuota;

    Plan(int requestsPerMinute, int monthlyQuota) {
        this.requestsPerMinute = requestsPerMinute;
        this.monthlyQuota = monthlyQuota;
    }

    public int requestsPerMinute() {
        return requestsPerMinute;
    }

    public int monthlyQuota() {
        return monthlyQuota;
    }
}
