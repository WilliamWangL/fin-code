package com.fincode.api.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * Card BIN/IIN directory row backing GET /v1/bin/{bin}.
 * Loaded from the external bank_bin_directory dataset or from the
 * api-ninjas.com /v2/bin provider on local misses.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "bank_bin_directory")
public class BankBinDirectory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 8)
    private String bin;

    @Column(length = 64)
    private String brand;

    @Column(length = 32)
    private String type;

    /** Comma-separated category list, e.g. "basic,classic". */
    @Column(length = 255)
    private String categories;

    @Column(length = 255)
    private String issuer;

    @Column(length = 128)
    private String country;

    // The DDL declares char(2); without columnDefinition Hibernate expects varchar(2)
    // and schema validation fails on the CHAR vs VARCHAR mismatch.
    @Column(name = "country_iso2", columnDefinition = "char(2)")
    private String countryIso2;

    @Column(name = "is_eu")
    private Boolean eu;

    @Column(name = "is_eea")
    private Boolean eea;

    @Column(name = "is_sepa")
    private Boolean sepa;

    @Column(name = "is_valid")
    private Boolean valid;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
