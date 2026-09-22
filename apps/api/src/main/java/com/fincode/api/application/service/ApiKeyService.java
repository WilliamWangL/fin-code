package com.fincode.api.application.service;

import com.fincode.api.domain.enums.ApiKeyStatus;
import com.fincode.api.domain.enums.Plan;
import com.fincode.api.domain.model.ApiKey;
import com.fincode.api.domain.repository.ApiKeyRepository;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * API key lifecycle (spec §24, FIN-014). Keys look like {@code sk_test_xxx} /
 * {@code sk_live_xxx}; only the SHA-256 hash is stored, the plaintext key is
 * returned exactly once at creation time.
 */
@Service
public class ApiKeyService {

    private static final String TEST_PREFIX = "sk_test_";
    private static final String LIVE_PREFIX = "sk_live_";
    private static final int VISIBLE_PREFIX_LENGTH = 12;
    private static final int SECRET_LENGTH = 32;
    private static final char[] SECRET_ALPHABET =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toCharArray();

    private final ApiKeyRepository apiKeyRepository;
    private final SecureRandom random = new SecureRandom();

    public ApiKeyService(ApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    @Transactional
    public CreatedKey create(String name, boolean live, Plan plan) {
        return create(name, live, plan, null);
    }

    @Transactional
    public CreatedKey create(String name, boolean live, Plan plan, Long organizationId) {
        String prefix = live ? LIVE_PREFIX : TEST_PREFIX;
        String rawKey = prefix + randomSecret();
        ApiKey apiKey = new ApiKey();
        apiKey.setName(name == null || name.isBlank() ? "Default key" : name.trim());
        apiKey.setKeyPrefix(rawKey.substring(0, VISIBLE_PREFIX_LENGTH));
        apiKey.setKeyHash(hash(rawKey));
        apiKey.setPlan(plan == null ? Plan.FREE : plan);
        apiKey.setOrganizationId(organizationId);
        return new CreatedKey(apiKeyRepository.save(apiKey), rawKey);
    }

    /** Keys of an organization, newest first (FIN-014 list). */
    public List<ApiKey> listForOrganization(Long organizationId) {
        return apiKeyRepository.findByOrganizationIdOrderByIdDesc(organizationId);
    }

    /** Revokes a key owned by the organization (idempotent). */
    @Transactional
    public ApiKey revoke(Long keyId, Long organizationId) {
        ApiKey apiKey = requireOwned(keyId, organizationId);
        if (apiKey.getStatus() != ApiKeyStatus.REVOKED) {
            apiKey.setStatus(ApiKeyStatus.REVOKED);
            apiKey.setRevokedAt(LocalDateTime.now(ZoneOffset.UTC));
        }
        return apiKey;
    }

    /** Revokes the old key and issues a replacement with the same name, mode and plan. */
    @Transactional
    public CreatedKey rotate(Long keyId, Long organizationId) {
        ApiKey existing = requireOwned(keyId, organizationId);
        boolean live = existing.getKeyPrefix() != null && existing.getKeyPrefix().startsWith(LIVE_PREFIX);
        revoke(existing.getId(), organizationId);
        return create(existing.getName(), live, existing.getPlan(), organizationId);
    }

    private ApiKey requireOwned(Long keyId, Long organizationId) {
        ApiKey apiKey = apiKeyRepository.findById(keyId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "The API key does not exist"));
        if (organizationId == null || !organizationId.equals(apiKey.getOrganizationId())) {
            throw new ApiException(ErrorCode.NOT_FOUND, "The API key does not exist");
        }
        return apiKey;
    }

    /**
     * Resolves a bearer token to an active key, or fails with UNAUTHORIZED /
     * API_KEY_EXPIRED. Records the last-used timestamp.
     */
    @Transactional
    public ApiKey authenticate(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        ApiKey apiKey = apiKeyRepository.findByKeyHash(hash(rawKey.trim()))
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
        if (apiKey.getStatus() != ApiKeyStatus.ACTIVE) {
            throw new ApiException(ErrorCode.API_KEY_EXPIRED);
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (apiKey.getExpiresAt() != null && apiKey.getExpiresAt().isBefore(now)) {
            throw new ApiException(ErrorCode.API_KEY_EXPIRED);
        }
        apiKey.setLastUsedAt(now);
        return apiKey;
    }

    public static String hash(String rawKey) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawKey.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte value : digest) {
                hex.append(Character.forDigit((value >> 4) & 0xF, 16));
                hex.append(Character.forDigit(value & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private String randomSecret() {
        StringBuilder secret = new StringBuilder(SECRET_LENGTH);
        for (int i = 0; i < SECRET_LENGTH; i++) {
            secret.append(SECRET_ALPHABET[random.nextInt(SECRET_ALPHABET.length)]);
        }
        return secret.toString();
    }

    /** The creation result: metadata plus the plaintext key shown only once. */
    public record CreatedKey(ApiKey apiKey, String rawKey) {
    }
}
