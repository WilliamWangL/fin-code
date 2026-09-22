package com.fincode.api.dto;

import com.fincode.api.dto.OrganizationDtos.OrganizationData;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Request/response payloads for developer account auth (FIN-003, spec §25
 * envelope applies).
 */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @Size(max = 100) String name) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record LogoutRequest(String refreshToken) {
    }

    public record PasswordResetRequest(@NotBlank @Email String email) {
    }

    public record PasswordResetConfirmRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 72) String newPassword) {
    }

    public record UserData(
            Long id,
            String email,
            String name,
            String status,
            boolean emailVerified,
            LocalDateTime createdAt) {
    }

    public record AuthTokens(String accessToken, String refreshToken, String tokenType, long expiresIn) {
    }

    public record RegisterData(UserData user, OrganizationData organization, AuthTokens tokens) {
    }

    public record LoginData(UserData user, AuthTokens tokens) {
    }

    public record MeData(UserData user, List<OrganizationData> organizations) {
    }

    public record LogoutData(boolean loggedOut) {
    }

    /**
     * {@code resetToken} is only populated in local/development profiles until
     * email delivery exists; production returns an empty body.
     */
    public record PasswordResetRequestData(String resetToken) {
    }

    public record PasswordResetConfirmData(boolean passwordUpdated) {
    }
}
