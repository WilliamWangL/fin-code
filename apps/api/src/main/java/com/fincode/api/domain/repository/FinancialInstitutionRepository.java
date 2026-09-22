package com.fincode.api.domain.repository;

import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.model.FinancialInstitution;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FinancialInstitutionRepository extends JpaRepository<FinancialInstitution, Long> {

    List<FinancialInstitution> findByCountryId(Long countryId);

    List<FinancialInstitution> findByStatusAndIdGreaterThanOrderByIdAsc(EntityStatus status, Long id, Pageable pageable);

    List<FinancialInstitution> findByStatusAndCountryIdAndIdGreaterThanOrderByIdAsc(
            EntityStatus status, Long countryId, Long id, Pageable pageable);

    /** Name search across English, local and short names (spec §27). */
    @Query("""
            SELECT f FROM FinancialInstitution f
            WHERE f.status = :status
              AND f.id > :afterId
              AND (:countryId IS NULL OR f.countryId = :countryId)
              AND (LOWER(COALESCE(f.nameEn, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(f.nameLocal, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(f.shortName, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY f.id ASC
            """)
    List<FinancialInstitution> search(@Param("status") EntityStatus status,
                                      @Param("q") String q,
                                      @Param("countryId") Long countryId,
                                      @Param("afterId") Long afterId,
                                      Pageable pageable);
}
