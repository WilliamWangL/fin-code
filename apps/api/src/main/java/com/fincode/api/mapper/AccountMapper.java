package com.fincode.api.mapper;

import com.fincode.api.domain.enums.OrganizationRole;
import com.fincode.api.domain.model.ApiKey;
import com.fincode.api.domain.model.Organization;
import com.fincode.api.domain.model.OrganizationMember;
import com.fincode.api.domain.model.UserAccount;
import com.fincode.api.dto.ApiKeyDtos.ApiKeyCreatedData;
import com.fincode.api.dto.ApiKeyDtos.ApiKeyData;
import com.fincode.api.dto.AuthDtos.UserData;
import com.fincode.api.dto.OrganizationDtos.MemberData;
import com.fincode.api.dto.OrganizationDtos.OrganizationData;

/**
 * Maps account entities to their wire representations (snake_case handled by
 * the global Jackson naming strategy).
 */
public final class AccountMapper {

    private AccountMapper() {
    }

    public static UserData toUserData(UserAccount user) {
        return new UserData(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getStatus() == null ? null : user.getStatus().name(),
                user.isEmailVerified(),
                user.getCreatedAt());
    }

    public static OrganizationData toOrganizationData(Organization organization, OrganizationRole role) {
        return new OrganizationData(
                organization.getId(),
                organization.getName(),
                organization.getSlug(),
                organization.getPlan() == null ? null : organization.getPlan().name(),
                role == null ? null : role.name(),
                organization.getCreatedAt());
    }

    public static MemberData toMemberData(OrganizationMember member, UserAccount user) {
        return new MemberData(
                member.getId(),
                member.getUserId(),
                user == null ? null : user.getEmail(),
                user == null ? null : user.getName(),
                member.getRole() == null ? null : member.getRole().name(),
                member.getStatus() == null ? null : member.getStatus().name(),
                member.getCreatedAt());
    }

    public static ApiKeyData toApiKeyData(ApiKey apiKey) {
        return new ApiKeyData(
                apiKey.getId(),
                apiKey.getName(),
                apiKey.getKeyPrefix(),
                apiKey.getPlan() == null ? null : apiKey.getPlan().name(),
                apiKey.getStatus() == null ? null : apiKey.getStatus().name(),
                apiKey.getOrganizationId(),
                apiKey.getLastUsedAt(),
                apiKey.getExpiresAt(),
                apiKey.getRevokedAt(),
                apiKey.getCreatedAt());
    }

    public static ApiKeyCreatedData toApiKeyCreatedData(ApiKey apiKey, String rawKey) {
        return new ApiKeyCreatedData(toApiKeyData(apiKey), rawKey);
    }
}
