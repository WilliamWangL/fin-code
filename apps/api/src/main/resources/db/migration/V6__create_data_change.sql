-- V6__create_data_change.sql
-- Change tracking / audit trail (spec §20, FIN-002).
-- Change types: NEW / UPDATED / REMOVED / REACTIVATED

CREATE TABLE data_change (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    dataset     VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id   BIGINT      NULL,
    change_type VARCHAR(32) NOT NULL,
    before_data JSON        NULL,
    after_data  JSON        NULL,
    source_id   BIGINT      NULL,
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_data_change_dataset (dataset, created_at),
    KEY idx_data_change_entity (entity_type, entity_id),
    CONSTRAINT fk_data_change_source FOREIGN KEY (source_id) REFERENCES data_source (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
