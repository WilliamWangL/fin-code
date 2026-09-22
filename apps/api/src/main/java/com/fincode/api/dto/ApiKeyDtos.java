package com.fincode.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * Request/response payloads for API key management (FIN-014). The plaintext
 * key is returned exactly once, at creation or rotation time.
 */
public final class ApiKeyDtos {

    private ApiKeyDtos() {
    }

    public record CreateApiKeyRequest(
            @NotBlank @Size(max = 100) String name,
            Boolean live) {
    }

    public record ApiKeyData(
            Long id,
            String name,
            String keyPrefix,
            String plan,
            String status,
            Long organizationId,
            LocalDateTime lastUsedAt,
            LocalDateTime expiresAt,
            LocalDateTime revokedAt,
            LocalDateTime createdAt) {
    }

    public record ApiKeyCreatedData(ApiKeyData apiKey, String key) {
    }
}
