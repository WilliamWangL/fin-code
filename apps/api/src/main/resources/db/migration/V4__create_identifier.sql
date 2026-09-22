-- V4__create_identifier.sql
-- Bank identifiers: SWIFT / routing / sort code / BSB / IFSC / CNAPS etc. (spec §15, FIN-002).
-- Global uniqueness of (identifier_type, identifier_value) is mandatory (spec §22).

CREATE TABLE bank_identifier (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    institution_id   BIGINT       NOT NULL,
    branch_id        BIGINT       NULL,
    identifier_type  VARCHAR(32)  NOT NULL,
    identifier_value VARCHAR(64)  NOT NULL,
    country_code     VARCHAR(2)   NULL,
    status           VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    source_id        BIGINT       NULL,
    valid_from       DATE         NULL,
    valid_to         DATE         NULL,
    verified_at      DATETIME(6)  NULL,
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_bank_identifier_type_value (identifier_type, identifier_value),
    KEY idx_bank_identifier_institution (institution_id),
    KEY idx_bank_identifier_branch (branch_id),
    KEY idx_bank_identifier_value (identifier_value),
    CONSTRAINT fk_bank_identifier_institution FOREIGN KEY (institution_id) REFERENCES financial_institution (id),
    CONSTRAINT fk_bank_identifier_branch FOREIGN KEY (branch_id) REFERENCES bank_branch (id),
    CONSTRAINT fk_bank_identifier_source FOREIGN KEY (source_id) REFERENCES data_source (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
