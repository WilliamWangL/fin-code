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
 * Audit trail of verified PayPal webhook events (FIN-019). The unique event id
 * makes webhook handling idempotent: PayPal retries deliveries and may send
 * the same event more than once.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "paypal_webhook_event")
public class PayPalWebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, length = 64)
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(name = "subscription_id", length = 64)
    private String subscriptionId;

    @Column(nullable = false)
    private boolean verified;

    /** Truncated raw body for auditing; never contains card or credential data. */
    @Column(length = 2000)
    private String payload;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
