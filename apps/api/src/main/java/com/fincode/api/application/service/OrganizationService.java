package com.fincode.api.application.service;

import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.enums.OrganizationRole;
import com.fincode.api.domain.model.Organization;
import com.fincode.api.domain.model.OrganizationMember;
import com.fincode.api.domain.model.UserAccount;
import com.fincode.api.domain.repository.OrganizationMemberRepository;
import com.fincode.api.domain.repository.OrganizationRepository;
import com.fincode.api.domain.repository.UserAccountRepository;
import com.fincode.api.dto.OrganizationDtos.MemberData;
import com.fincode.api.dto.OrganizationDtos.OrganizationData;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import com.fincode.api.mapper.AccountMapper;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.function.Predicate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization and membership management (FIN-004). Roles act as coarse
 * permissions: OWNER manages members and roles, ADMIN manages members, MEMBER
 * has read access.
 */
@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository memberRepository;
    private final UserAccountRepository userAccountRepository;

    public OrganizationService(OrganizationRepository organizationRepository,
                               OrganizationMemberRepository memberRepository,
                               UserAccountRepository userAccountRepository) {
        this.organizationRepository = organizationRepository;
        this.memberRepository = memberRepository;
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional(readOnly = true)
    public List<OrganizationData> listMine(Long userId) {
        return memberRepository.findByUserId(userId).stream()
                .sorted(Comparator.comparing(OrganizationMember::getId))
                .map(membership -> organizationRepository.findById(membership.getOrganizationId())
                        .map(organization -> AccountMapper.toOrganizationData(organization, membership.getRole()))
                        .orElse(null))
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrganizationData get(Long organizationId, Long userId) {
        OrganizationMember membership = requireMember(organizationId, userId);
        return AccountMapper.toOrganizationData(requireOrganization(organizationId), membership.getRole());
    }

    @Transactional(readOnly = true)
    public List<MemberData> members(Long organizationId, Long userId) {
        requireMember(organizationId, userId);
        return memberRepository.findByOrganizationIdOrderByIdAsc(organizationId).stream()
                .map(member -> userAccountRepository.findById(member.getUserId())
                        .map(user -> AccountMapper.toMemberData(member, user))
                        .orElse(null))
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional
    public MemberData addMember(Long organizationId, AuthPrincipal actor, String email, String roleName) {
        requireRole(organizationId, actor, OrganizationRole::canManageMembers);
        OrganizationRole role = parseAssignableRole(roleName);
        UserAccount target = userAccountRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "No account with this email exists"));
        if (memberRepository.findByOrganizationIdAndUserId(organizationId, target.getId()).isPresent()) {
            throw new ApiException(ErrorCode.MEMBER_ALREADY_EXISTS);
        }
        OrganizationMember member = new OrganizationMember();
        member.setOrganizationId(organizationId);
        member.setUserId(target.getId());
        member.setRole(role);
        member = memberRepository.save(member);
        return AccountMapper.toMemberData(member, target);
    }

    @Transactional
    public MemberData updateMemberRole(Long organizationId, Long memberId, AuthPrincipal actor, String roleName) {
        requireRole(organizationId, actor, OrganizationRole::canChangeRoles);
        OrganizationMember member = requireMemberRecord(organizationId, memberId);
        if (member.getRole() == OrganizationRole.OWNER) {
            throw new ApiException(ErrorCode.FORBIDDEN, "The owner's role cannot be changed");
        }
        member.setRole(parseAssignableRole(roleName));
        UserAccount user = userAccountRepository.findById(member.getUserId()).orElse(null);
        return AccountMapper.toMemberData(member, user);
    }

    @Transactional
    public void removeMember(Long organizationId, Long memberId, AuthPrincipal actor) {
        OrganizationMember actorMembership = requireRole(organizationId, actor, OrganizationRole::canManageMembers);
        OrganizationMember member = requireMemberRecord(organizationId, memberId);
        if (member.getRole() == OrganizationRole.OWNER) {
            throw new ApiException(ErrorCode.FORBIDDEN, "The owner cannot be removed");
        }
        if (actorMembership.getRole() == OrganizationRole.ADMIN && member.getRole() == OrganizationRole.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Administrators cannot remove each other");
        }
        memberRepository.delete(member);
    }

    private Organization requireOrganization(Long organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "The organization does not exist"));
    }

    private OrganizationMember requireMember(Long organizationId, Long userId) {
        return memberRepository.findByOrganizationIdAndUserId(organizationId, userId)
                .filter(member -> member.getStatus() == EntityStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(ErrorCode.FORBIDDEN, "You are not a member of this organization"));
    }

    private OrganizationMember requireRole(Long organizationId, AuthPrincipal actor, Predicate<OrganizationRole> allowed) {
        OrganizationMember membership = requireMember(organizationId, actor.userId());
        if (!allowed.test(membership.getRole())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        return membership;
    }

    private OrganizationMember requireMemberRecord(Long organizationId, Long memberId) {
        return memberRepository.findByIdAndOrganizationId(memberId, organizationId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "The member does not exist"));
    }

    /** OWNER is never assignable after creation; only ADMIN and MEMBER can be granted. */
    private OrganizationRole parseAssignableRole(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return OrganizationRole.MEMBER;
        }
        try {
            OrganizationRole role = OrganizationRole.valueOf(roleName.trim().toUpperCase(Locale.ROOT));
            if (role == OrganizationRole.OWNER) {
                throw new ApiException(ErrorCode.INVALID_REQUEST, "The OWNER role cannot be granted");
            }
            return role;
        } catch (IllegalArgumentException exception) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "The role must be ADMIN or MEMBER");
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
