package com.fincode.api.domain.repository;

import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.model.BankBranch;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BankBranchRepository extends JpaRepository<BankBranch, Long> {

    List<BankBranch> findByInstitutionId(Long institutionId);

    List<BankBranch> findByInstitutionIdAndStatusAndIdGreaterThanOrderByIdAsc(
            Long institutionId, EntityStatus status, Long id, Pageable pageable);

    long countByInstitutionIdAndStatus(Long institutionId, EntityStatus status);

    /**
     * Filtered branch page: {@code q} matches branch name (local/EN) or city
     * case-insensitively, {@code city} is an exact match. Null params disable
     * the filter, collapsing to the plain paged scan.
     */
    @Query("""
            SELECT b FROM BankBranch b
            WHERE b.institutionId = :institutionId
              AND b.status = :status
              AND (:city IS NULL OR b.city = :city)
              AND (:q IS NULL
                   OR LOWER(COALESCE(b.branchName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(b.branchNameEn, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :q, '%')))
              AND b.id > :afterId
            ORDER BY b.id ASC
            """)
    List<BankBranch> searchBranches(@Param("institutionId") Long institutionId,
                                    @Param("status") EntityStatus status,
                                    @Param("q") String q,
                                    @Param("city") String city,
                                    @Param("afterId") Long afterId,
                                    Pageable pageable);
}
