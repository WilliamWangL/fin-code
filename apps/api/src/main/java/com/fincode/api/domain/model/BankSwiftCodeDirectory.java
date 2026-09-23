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
 * SWIFT/BIC directory row backing GET /v1/swift/{code}.
 * Loaded from the external bank_swift_code_directory dataset.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "bank_swift_code_directory")
public class BankSwiftCodeDirectory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "swift_code", nullable = false, length = 11)
    private String swiftCode;

    @Column(name = "bank_name", length = 512)
    private String bankName;

    @Column(length = 1024)
    private String address;

    @Column(length = 128)
    private String city;

    @Column(length = 128)
    private String region;

    @Column(name = "postal_code", length = 255)
    private String postalCode;

    @Column(length = 128)
    private String country;

    // The DDL declares char(2); without columnDefinition Hibernate expects varchar(2)
    // and schema validation fails on the CHAR vs VARCHAR mismatch.
    @Column(name = "country_code", columnDefinition = "char(2)")
    private String countryCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
