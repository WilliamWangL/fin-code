package com.fincode.api.domain.repository;

import com.fincode.api.domain.enums.IdentifierType;
import com.fincode.api.domain.model.BankIdentifier;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankIdentifierRepository extends JpaRepository<BankIdentifier, Long> {

    Optional<BankIdentifier> findByIdentifierTypeAndIdentifierValue(IdentifierType identifierType, String identifierValue);

    List<BankIdentifier> findByInstitutionId(Long institutionId);

    List<BankIdentifier> findByInstitutionIdAndIdentifierType(Long institutionId, IdentifierType identifierType);

    List<BankIdentifier> findByBranchId(Long branchId);

    List<BankIdentifier> findByInstitutionIdInOrderByIdAsc(Collection<Long> institutionIds);

    /** Closest candidates for lookup suggestions (spec §29). */
    List<BankIdentifier> findTop5ByIdentifierValueContainingOrderByIdentifierValueAsc(String identifierValue);
}
