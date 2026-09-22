package com.fincode.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

/**
 * Request/response payloads for organizations and members (FIN-004).
 */
public final class OrganizationDtos {

    private OrganizationDtos() {
    }

    public record OrganizationData(
            Long id,
            String name,
            String slug,
            String plan,
            String role,
            LocalDateTime createdAt) {
    }

    public record MemberData(
            Long id,
            Long userId,
            String email,
            String name,
            String role,
            String status,
            LocalDateTime joinedAt) {
    }

    public record AddMemberRequest(@NotBlank @Email String email, String role) {
    }

    public record UpdateMemberRoleRequest(@NotBlank String role) {
    }

    public record RemoveMemberData(boolean removed) {
    }
}
