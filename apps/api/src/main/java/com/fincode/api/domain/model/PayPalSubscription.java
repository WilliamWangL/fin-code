package com.fincode.api.domain.model;

import com.fincode.api.domain.enums.Plan;
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
 * PayPal subscription mirrored locally (FIN-019). The provider remains the
 * source of truth; this row carries the entitlement state used by quota and
 * rate limit checks so they never call out to PayPal.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "paypal_subscription")
public class PayPalSubscription {

    /** PayPal subscription lifecycle (stored verbatim from the provider). */
    public static final String STATUS_APPROVAL_PENDING = "APPROVAL_PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_SUSPENDED = "SUSPENDED";
    public static final String STATUS_CANCELLED = "CANCELLED";
    public static final String STATUS_EXPIRED = "EXPIRED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "subscription_id", nullable = false, length = 64)
    private String subscriptionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Plan plan = Plan.FREE;

    @Column(nullable = false, length = 32)
    private String status = STATUS_APPROVAL_PENDING;

    @Column(name = "payer_id", length = 64)
    private String payerId;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    /** Entitlement is kept until this instant after cancellation. */
    @Column(name = "next_billing_time")
    private LocalDateTime nextBillingTime;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    /** Last time the provider state was pulled (reconciliation job). */
    @Column(name = "synced_at")
    private LocalDateTime syncedAt;

    /** Last webhook received for this subscription. */
    @Column(name = "last_event_at")
    private LocalDateTime lastEventAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
