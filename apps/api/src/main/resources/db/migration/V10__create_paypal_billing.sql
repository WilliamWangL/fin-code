-- V10__create_paypal_billing.sql
-- PayPal subscription billing (spec §84, FIN-019). The original document
-- planned Stripe; per user decision PayPal subscriptions replace it. The local
-- tables mirror provider state so plan and quota checks never depend on PayPal
-- being reachable, and webhook events are stored for audit and idempotency.

CREATE TABLE paypal_subscription (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    organization_id   BIGINT       NOT NULL,
    subscription_id   VARCHAR(64)  NOT NULL, -- PayPal subscription id (I-XXXX)
    plan              VARCHAR(32)  NOT NULL, -- local plan: DEVELOPER / STARTUP / BUSINESS
    status            VARCHAR(32)  NOT NULL, -- APPROVAL_PENDING / APPROVED / ACTIVE / SUSPENDED / CANCELLED / EXPIRED
    payer_id          VARCHAR(64)  NULL,
    start_time        DATETIME(6)  NULL,
    next_billing_time DATETIME(6)  NULL, -- entitlement is kept until this instant after cancellation
    cancelled_at      DATETIME(6)  NULL,
    synced_at         DATETIME(6)  NULL, -- last time provider state was pulled
    last_event_at     DATETIME(6)  NULL, -- last webhook received for this subscription
    created_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_paypal_subscription_subscription (subscription_id),
    KEY idx_paypal_subscription_org (organization_id),
    CONSTRAINT fk_paypal_subscription_org FOREIGN KEY (organization_id) REFERENCES organization (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE paypal_webhook_event (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    event_id        VARCHAR(64)   NOT NULL, -- PayPal event id, unique across retries
    event_type      VARCHAR(64)   NOT NULL, -- e.g. BILLING.SUBSCRIPTION.ACTIVATED
    subscription_id VARCHAR(64)   NULL,
    verified        BOOLEAN       NOT NULL DEFAULT FALSE,
    payload         VARCHAR(2000) NULL, -- truncated raw body, for auditing only
    processed_at    DATETIME(6)   NULL,
    created_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_paypal_webhook_event_event (event_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
