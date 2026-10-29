package com.fincode.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Tunables for the anonymous website lookups (spec §42). The per-minute burst
 * stays a constant in {@code RateLimitService}; the daily allowance is
 * configurable because it is a product decision rather than a safety valve.
 */
@Component
@ConfigurationProperties(prefix = "fincode.rate-limit")
public class RateLimitProperties {

    /**
     * Lookups an anonymous client IP may make per UTC day across every
     * identifier page. Zero or negative disables the daily cap.
     */
    private int anonymousDailyLimit = 5;

    public int getAnonymousDailyLimit() {
        return anonymousDailyLimit;
    }

    public void setAnonymousDailyLimit(int anonymousDailyLimit) {
        this.anonymousDailyLimit = anonymousDailyLimit;
    }
}
