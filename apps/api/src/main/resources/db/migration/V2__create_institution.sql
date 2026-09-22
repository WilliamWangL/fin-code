-- V2__create_institution.sql
-- Financial institutions (spec §13, FIN-002).

CREATE TABLE financial_institution (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    legal_name       VARCHAR(200) NOT NULL,
    name_en          VARCHAR(200) NULL,
    name_local       VARCHAR(200) NULL,
    short_name       VARCHAR(64)  NULL,
    country_id       BIGINT       NOT NULL,
    institution_type VARCHAR(32)  NOT NULL, -- BANK / CREDIT_UNION / ... (spec §13)
    website          VARCHAR(300) NULL,
    status           VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_financial_institution_country (country_id),
    KEY idx_financial_institution_name_en (name_en),
    KEY idx_financial_institution_status (status),
    CONSTRAINT fk_financial_institution_country FOREIGN KEY (country_id) REFERENCES country (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
