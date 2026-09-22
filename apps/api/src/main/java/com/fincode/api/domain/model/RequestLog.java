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

/**
 * Per-request usage record (spec §44). No financial payload data is stored.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "request_log")
public class RequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "api_key_id")
    private Long apiKeyId;

    @Column(name = "organization_id")
    private Long organizationId;

    @Column(nullable = false, length = 120)
    private String endpoint;

    @Column(nullable = false, length = 10)
    private String method;

    @Column(name = "identifier_type", length = 32)
    private String identifierType;

    @Column(length = 2)
    private String country;

    @Column(name = "status_code", nullable = false)
    private Integer statusCode;

    @Column(name = "response_time", nullable = false)
    private Integer responseTime;

    @Column(name = "request_date", nullable = false)
    private LocalDateTime requestDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
