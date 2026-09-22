package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.OrganizationMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, Long> {

    List<OrganizationMember> findByUserId(Long userId);

    List<OrganizationMember> findByOrganizationIdOrderByIdAsc(Long organizationId);

    Optional<OrganizationMember> findByOrganizationIdAndUserId(Long organizationId, Long userId);

    Optional<OrganizationMember> findByIdAndOrganizationId(Long id, Long organizationId);

    long countByOrganizationIdAndRole(Long organizationId, com.fincode.api.domain.enums.OrganizationRole role);
}
