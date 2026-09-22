package com.fincode.api.application.service;

import com.fincode.api.config.AuthProperties;
import com.fincode.api.domain.enums.OrganizationRole;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

/**
 * Issues and verifies HS256 access tokens for developer accounts (FIN-003).
 * Refresh tokens are opaque and live in the database, not in the JWT.
 */
@Component
public class JwtService {

    private static final String ISSUER = "fincode-api";

    private final SecretKey key;
    private final Duration accessTokenTtl;

    public JwtService(AuthProperties properties) {
        String secret = properties.getJwtSecret();
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(
                    "fincode.auth.jwt-secret (JWT_SECRET) must be at least 32 characters for HS256");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtl = properties.getAccessTokenTtl();
    }

    public long accessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }

    public String createAccessToken(Long userId, Long organizationId, OrganizationRole role) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)));
        if (organizationId != null) {
            builder.claim("org", organizationId);
        }
        if (role != null) {
            builder.claim("role", role.name());
        }
        return builder.signWith(key).compact();
    }

    /** Verifies a token and extracts the principal; any failure maps to TOKEN_EXPIRED. */
    public AuthPrincipal parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Long userId = Long.valueOf(claims.getSubject());
            Object organizationClaim = claims.get("org");
            Long organizationId = organizationClaim == null ? null : Long.valueOf(organizationClaim.toString());
            String role = claims.get("role", String.class);
            return new AuthPrincipal(userId, organizationId,
                    role == null ? null : OrganizationRole.valueOf(role));
        } catch (JwtException | IllegalArgumentException exception) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED);
        }
    }
}
