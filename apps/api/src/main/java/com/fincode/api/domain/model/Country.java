package com.fincode.api.domain.model;

import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.enums.IdentifierType;
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
 * Country reference data (spec §11).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "country")
public class Country {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 2)
    private String iso2;

    @Column(nullable = false, length = 3)
    private String iso3;

    @Column(name = "numeric_code", length = 3)
    private String numericCode;

    @Column(name = "name_en", nullable = false, length = 100)
    private String nameEn;

    @Column(name = "name_local", length = 150)
    private String nameLocal;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "iban_supported", nullable = false)
    private Boolean ibanSupported = false;

    @Column(name = "swift_supported", nullable = false)
    private Boolean swiftSupported = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "local_identifier_type", length = 32)
    private IdentifierType localIdentifierType;

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
