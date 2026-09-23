package com.fincode.api.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * ABA routing number directory row backing GET /v1/routing/{number}.
 * Loaded from the external bank_routing_directory dataset.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "bank_routing_directory")
public class BankRoutingDirectory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "routing_number", nullable = false, length = 20)
    private String routingNumber;

    @Column(name = "bank_name", length = 255)
    private String bankName;

    @Column(name = "street_address", length = 255)
    private String streetAddress;

    @Column(length = 100)
    private String city;

    @Column(length = 50)
    private String state;

    @Column(name = "zip_code", length = 255)
    private String zipCode;

    @Column(length = 100)
    private String country;

    @Column(length = 100)
    private String county;

    @Column(length = 50)
    private String timezone;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 7)
    private BigDecimal longitude;

    @Column(name = "phone_number", length = 50)
    private String phoneNumber;

    @Column(name = "ach_supported")
    private Boolean achSupported;

    @Column(name = "fedwire_supported")
    private Boolean fedwireSupported;

    @Column(name = "checksum_valid")
    private Boolean checksumValid;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
