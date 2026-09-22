-- V1__init.sql
-- Baseline schemas: data governance + geography (spec §12-20, FIN-002).
-- Conventions (spec §21): MySQL 8, utf8mb4, UTC, BIGINT ids, JSON where needed.

CREATE TABLE data_source (
    id                     BIGINT       NOT NULL AUTO_INCREMENT,
    name                   VARCHAR(200) NOT NULL,
    source_type            VARCHAR(32)  NOT NULL, -- OFFICIAL / LICENSED / BANK / PUBLIC / COMMUNITY / MANUAL
    provider               VARCHAR(200) NULL,
    source_url             VARCHAR(500) NULL,
    license                VARCHAR(200) NULL,
    commercial_use         BOOLEAN      NOT NULL DEFAULT FALSE,
    redistribution_allowed BOOLEAN      NOT NULL DEFAULT FALSE,
    storage_allowed        BOOLEAN      NOT NULL DEFAULT FALSE,
    retrieved_at           DATETIME(6)  NULL,
    status                 VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_at             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_data_source_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE currency (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    code         VARCHAR(3)   NOT NULL, -- ISO 4217 alpha code
    numeric_code VARCHAR(3)   NULL,     -- ISO 4217 numeric code
    name_en      VARCHAR(100) NOT NULL,
    name_local   VARCHAR(100) NULL,
    minor_unit   TINYINT      NULL,
    symbol       VARCHAR(10)  NULL,
    status       VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_currency_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE country (
    id                    BIGINT       NOT NULL AUTO_INCREMENT,
    iso2                  VARCHAR(2)   NOT NULL,
    iso3                  VARCHAR(3)   NOT NULL,
    numeric_code          VARCHAR(3)   NULL,
    name_en               VARCHAR(100) NOT NULL,
    name_local            VARCHAR(150) NULL,
    currency_code         VARCHAR(3)   NULL,
    iban_supported        BOOLEAN      NOT NULL DEFAULT FALSE,
    swift_supported       BOOLEAN      NOT NULL DEFAULT FALSE,
    local_identifier_type VARCHAR(32)  NULL, -- e.g. SORT_CODE, BSB, IFSC, CNAPS
    status                VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_at            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_country_iso2 (iso2),
    UNIQUE KEY uk_country_iso3 (iso3)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE iban_country_format (
    id                         BIGINT       NOT NULL AUTO_INCREMENT,
    country_code               VARCHAR(2)   NOT NULL,
    iban_length                INT          NOT NULL,
    bban_length                INT          NOT NULL,
    structure                  VARCHAR(160) NOT NULL, -- e.g. DEkk BBBB BBBB CCCC CCCC CC
    example                    VARCHAR(64)  NULL,
    bank_identifier_position   VARCHAR(16)  NULL,     -- 1-based "start-length", e.g. "5-8"
    branch_identifier_position VARCHAR(16)  NULL,
    account_number_position    VARCHAR(16)  NULL,
    version                    VARCHAR(16)  NOT NULL DEFAULT '1',
    effective_date             DATE         NULL,
    source_id                  BIGINT       NULL,
    status                     VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_at                 DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at                 DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_iban_country_format_country_version (country_code, version),
    KEY idx_iban_country_format_source (source_id),
    CONSTRAINT fk_iban_country_format_source FOREIGN KEY (source_id) REFERENCES data_source (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
