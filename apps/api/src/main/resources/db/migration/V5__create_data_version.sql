-- V5__create_data_version.sql
-- Dataset versioning (spec §19, FIN-002).
-- Status lifecycle: DRAFT -> VALIDATING -> READY -> PUBLISHED -> ROLLED_BACK

CREATE TABLE data_version (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    dataset      VARCHAR(64)  NOT NULL,
    version      VARCHAR(32)  NOT NULL,
    source_id    BIGINT       NULL,
    record_count INT          NULL,
    checksum     VARCHAR(128) NULL,
    status       VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    published_at DATETIME(6)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_data_version_dataset_version (dataset, version),
    KEY idx_data_version_status (status),
    CONSTRAINT fk_data_version_source FOREIGN KEY (source_id) REFERENCES data_source (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
