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
 * National bank code to SWIFT/BIC mapping row backing GET /v1/iban/{iban}.
 * The bank code is extracted from the IBAN's BBAN; the mapped SWIFT code then
 * serves the bank details from bank_swift_code_directory. Rows arrive from
 * the api-ninjas.com /v1/iban provider on local misses or from bulk imports.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "iban_bank_code_map")
public class IbanBankCodeMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ISO 3166-1 alpha-2 country code, e.g. "DE". */
    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    /** Bank identifier carried inside the IBAN's BBAN, e.g. the German BLZ "37040044". */
    @Column(name = "bank_code", nullable = false, length = 16)
    private String bankCode;

    /** The institution's SWIFT/BIC, 8 or 11 characters, e.g. "COBADEFF" or "COBADEFFXXX". */
    @Column(name = "swift_code", nullable = false, length = 11)
    private String swiftCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
