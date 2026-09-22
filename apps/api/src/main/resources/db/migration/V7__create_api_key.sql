-- V7__create_api_key.sql
-- API keys for V1 authentication (spec §24, FIN-014).
-- Only the SHA-256 hash is stored; plaintext keys are never persisted.

CREATE TABLE api_key (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL,
    key_prefix      VARCHAR(16)  NOT NULL, -- sk_test_ / sk_live_
    key_hash        VARCHAR(128) NOT NULL,
    organization_id BIGINT       NULL,     -- reserved for FIN-004 Organization
    plan            VARCHAR(32)  NOT NULL DEFAULT 'FREE',
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE', -- ACTIVE / REVOKED
    last_used_at    DATETIME(6)  NULL,
    expires_at      DATETIME(6)  NULL,
    revoked_at      DATETIME(6)  NULL,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_api_key_key_hash (key_hash),
    KEY idx_api_key_organization (organization_id),
    KEY idx_api_key_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
