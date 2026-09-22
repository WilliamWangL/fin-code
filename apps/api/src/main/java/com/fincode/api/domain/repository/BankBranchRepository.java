package com.fincode.api.domain.repository;

import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.model.BankBranch;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankBranchRepository extends JpaRepository<BankBranch, Long> {

    List<BankBranch> findByInstitutionId(Long institutionId);

    List<BankBranch> findByInstitutionIdAndStatusAndIdGreaterThanOrderByIdAsc(
            Long institutionId, EntityStatus status, Long id, Pageable pageable);
}
