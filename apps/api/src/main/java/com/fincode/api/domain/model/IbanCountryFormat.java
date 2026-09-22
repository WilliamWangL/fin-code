package com.fincode.api.domain.model;

import com.fincode.api.domain.enums.EntityStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Per-country IBAN format definition (spec §16).
 * Position fields use 1-based "start-length" notation, e.g. "5-8".
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "iban_country_format")
public class IbanCountryFormat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    @Column(name = "iban_length", nullable = false)
    private Integer ibanLength;

    @Column(name = "bban_length", nullable = false)
    private Integer bbanLength;

    @Column(nullable = false, length = 160)
    private String structure;

    @Column(length = 64)
    private String example;

    @Column(name = "bank_identifier_position", length = 16)
    private String bankIdentifierPosition;

    @Column(name = "branch_identifier_position", length = 16)
    private String branchIdentifierPosition;

    @Column(name = "account_number_position", length = 16)
    private String accountNumberPosition;

    @Column(nullable = false, length = 16)
    private String version = "1";

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "source_id")
    private Long sourceId;

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
