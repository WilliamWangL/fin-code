package com.fincode.api.domain.model;

import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.enums.InstitutionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Financial institution aggregate root (spec §13).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "financial_institution")
public class FinancialInstitution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "legal_name", nullable = false, length = 200)
    private String legalName;

    @Column(name = "name_en", length = 200)
    private String nameEn;

    @Column(name = "name_local", length = 200)
    private String nameLocal;

    @Column(name = "short_name", length = 64)
    private String shortName;

    @Column(name = "country_id", nullable = false)
    private Long countryId;

    @Enumerated(EnumType.STRING)
    @Column(name = "institution_type", nullable = false, length = 32)
    private InstitutionType institutionType;

    @Column(length = 300)
    private String website;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private EntityStatus status = EntityStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
