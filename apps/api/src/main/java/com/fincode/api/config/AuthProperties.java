package com.fincode.api.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Developer account auth settings (spec §68: secrets come from the
 * environment, never from Git).
 */
@Component
@ConfigurationProperties(prefix = "fincode.auth")
public class AuthProperties {

    /** HMAC secret for access tokens; must be at least 32 characters. */
    private String jwtSecret;

    private Duration accessTokenTtl = Duration.ofMinutes(15);

    private Duration refreshTokenTtl = Duration.ofDays(30);

    private Duration passwordResetTtl = Duration.ofHours(1);

    /** Local/dev only: return the reset token in the response when no mailer exists yet. */
    private boolean exposeResetToken;

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public Duration getAccessTokenTtl() {
        return accessTokenTtl;
    }

    public void setAccessTokenTtl(Duration accessTokenTtl) {
        this.accessTokenTtl = accessTokenTtl;
    }

    public Duration getRefreshTokenTtl() {
        return refreshTokenTtl;
    }

    public void setRefreshTokenTtl(Duration refreshTokenTtl) {
        this.refreshTokenTtl = refreshTokenTtl;
    }

    public Duration getPasswordResetTtl() {
        return passwordResetTtl;
    }

    public void setPasswordResetTtl(Duration passwordResetTtl) {
        this.passwordResetTtl = passwordResetTtl;
    }

    public boolean isExposeResetToken() {
        return exposeResetToken;
    }

    public void setExposeResetToken(boolean exposeResetToken) {
        this.exposeResetToken = exposeResetToken;
    }
}
