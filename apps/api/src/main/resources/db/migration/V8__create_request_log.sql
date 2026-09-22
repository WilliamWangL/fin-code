-- V8__create_request_log.sql
-- Per-request usage log for quota & analytics (spec §44, FIN-015).
-- Financial account payloads are never stored here (spec §44).

CREATE TABLE request_log (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    api_key_id      BIGINT       NULL,
    organization_id BIGINT       NULL,
    endpoint        VARCHAR(120) NOT NULL,
    method          VARCHAR(10)  NOT NULL,
    identifier_type VARCHAR(32)  NULL,
    country         VARCHAR(2)   NULL,
    status_code     INT          NOT NULL,
    response_time   INT          NOT NULL, -- milliseconds
    request_date    DATETIME(6)  NOT NULL,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_request_log_key_date (api_key_id, request_date),
    KEY idx_request_log_date (request_date),
    CONSTRAINT fk_request_log_api_key FOREIGN KEY (api_key_id) REFERENCES api_key (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
