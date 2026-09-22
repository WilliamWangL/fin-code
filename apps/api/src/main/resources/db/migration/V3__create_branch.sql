-- V3__create_branch.sql
-- Bank branches (spec §14, FIN-002).

CREATE TABLE bank_branch (
    id             BIGINT         NOT NULL AUTO_INCREMENT,
    institution_id BIGINT         NOT NULL,
    branch_name    VARCHAR(200)   NOT NULL,
    branch_name_en VARCHAR(200)   NULL,
    address        VARCHAR(300)   NULL,
    city           VARCHAR(100)   NULL,
    state          VARCHAR(100)   NULL,
    province       VARCHAR(100)   NULL,
    postal_code    VARCHAR(20)    NULL,
    latitude       DECIMAL(9, 6)  NULL,
    longitude      DECIMAL(9, 6)  NULL,
    phone          VARCHAR(40)    NULL,
    status         VARCHAR(32)    NOT NULL DEFAULT 'ACTIVE',
    created_at     DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_bank_branch_institution (institution_id),
    CONSTRAINT fk_bank_branch_institution FOREIGN KEY (institution_id) REFERENCES financial_institution (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
