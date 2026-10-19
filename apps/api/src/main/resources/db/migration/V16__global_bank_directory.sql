-- V16__global_bank_directory.sql
-- Global bank directory foundation (spec: 全球银行目录产品技术方案 §4):
--   1. financial_institution gains slug / name_norm / lei / merged_into for the
--      site URL contract, normalized name search and entity merge tracking.
--   2. institution_alias carries short names / former names / local names /
--      brands so name search resolves abbreviations (e.g. ANZ) to the full
--      institution record.
--   3. bank_swift_code_directory / bank_routing_directory gain a nullable
--      institution_id (enrichment-created rows resolve later via the
--      entity-resolution pipeline) plus record_status for retired codes.
--   4. import_batch + merge_review give the ingestion pipeline provenance per
--      run and a human review queue for low-confidence entity matches.

-- 1) Institution master data extensions
-- NOTE: column COMMENT belongs inside the column definition, i.e. BEFORE the
-- FIRST/AFTER placement clause (MySQL rejects "AFTER x COMMENT '...'" with 1064).
ALTER TABLE financial_institution
    ADD COLUMN slug        VARCHAR(140) NULL COMMENT '站点 URL 标识，由导入管道一次性写入并保持稳定' AFTER short_name,
    ADD COLUMN name_norm   VARCHAR(200) NULL COMMENT '归一化名称（小写、去后缀、去变音符），搜索用冗余列' AFTER name_en,
    ADD COLUMN lei         VARCHAR(20)  NULL COMMENT 'GLEIF LEI，全球机构主档对齐键' AFTER website,
    ADD COLUMN merged_into BIGINT       NULL COMMENT '软合并：指向保留机构 id，非 NULL 行对 API/导出不可见' AFTER status;

ALTER TABLE financial_institution
    ADD UNIQUE KEY uk_financial_institution_slug (slug),
    ADD KEY idx_financial_institution_norm (name_norm),
    ADD KEY idx_financial_institution_country_type (country_id, institution_type),
    ADD CONSTRAINT fk_financial_institution_merge
        FOREIGN KEY (merged_into) REFERENCES financial_institution (id),
    ADD FULLTEXT INDEX ft_institution_name (name_en, name_local, name_norm) WITH PARSER ngram;

-- 2) Institution aliases (short / former / local / brand names)
CREATE TABLE institution_alias (
    id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    institution_id  BIGINT       NOT NULL COMMENT '所属机构 id',
    alias           VARCHAR(200) NOT NULL COMMENT '别名原文（缩写/曾用名/本地名/品牌名）',
    alias_norm      VARCHAR(200) NOT NULL COMMENT '归一化别名，搜索匹配用',
    alias_type      VARCHAR(32)  NOT NULL DEFAULT 'SHORT_NAME' COMMENT '别名类型：SHORT_NAME/FORMER_NAME/LOCAL_NAME/BRAND/ABBREVIATION',
    source_id       BIGINT       NULL COMMENT '数据来源 id',
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    updated_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_institution_alias (institution_id, alias_norm),
    KEY idx_institution_alias_norm (alias_norm),
    CONSTRAINT fk_institution_alias_institution FOREIGN KEY (institution_id) REFERENCES financial_institution (id),
    CONSTRAINT fk_institution_alias_source FOREIGN KEY (source_id) REFERENCES data_source (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '机构别名表：一个机构可挂多个名称，支撑名称模糊搜索与实体归并';

-- 3) Directory rows link back to the institution + lifecycle status
ALTER TABLE bank_swift_code_directory
    ADD COLUMN institution_id BIGINT      NULL COMMENT '归属机构 id，实体解析回填；外部兜底新建行为 NULL' AFTER swift_code,
    ADD COLUMN record_status  VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT '记录状态：ACTIVE/DEPRECATED，失效 BIC 下架用';

ALTER TABLE bank_swift_code_directory
    ADD KEY idx_swift_directory_institution (institution_id),
    ADD CONSTRAINT fk_swift_directory_institution
        FOREIGN KEY (institution_id) REFERENCES financial_institution (id);

ALTER TABLE bank_routing_directory
    ADD COLUMN institution_id BIGINT      NULL COMMENT '归属机构 id，实体解析回填；外部兜底新建行为 NULL' AFTER routing_number,
    ADD COLUMN record_status  VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT '记录状态：ACTIVE/DEPRECATED';

ALTER TABLE bank_routing_directory
    ADD KEY idx_routing_directory_institution (institution_id),
    ADD CONSTRAINT fk_routing_directory_institution
        FOREIGN KEY (institution_id) REFERENCES financial_institution (id);

-- 4) Import provenance: one row per pipeline run
CREATE TABLE import_batch (
    id             BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    source_id      BIGINT       NOT NULL COMMENT '数据来源 id',
    batch_type     VARCHAR(16)  NOT NULL DEFAULT 'FULL' COMMENT '批次类型：FULL/DELTA',
    file_name      VARCHAR(300) NULL COMMENT '源文件名',
    row_count      INT          NOT NULL DEFAULT 0 COMMENT '源文件数据行数',
    inserted_count INT          NOT NULL DEFAULT 0 COMMENT '新插入行数',
    skipped_count  INT          NOT NULL DEFAULT 0 COMMENT '跳过行数（重复/非法）',
    merged_count   INT          NOT NULL DEFAULT 0 COMMENT '并入既有机构行数',
    status         VARCHAR(16)  NOT NULL DEFAULT 'RUNNING' COMMENT '批次状态：RUNNING/DONE/FAILED',
    started_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '开始时间',
    finished_at    DATETIME(6)  NULL COMMENT '结束时间',
    PRIMARY KEY (id),
    KEY idx_import_batch_source (source_id),
    CONSTRAINT fk_import_batch_source FOREIGN KEY (source_id) REFERENCES data_source (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '导入批次表：每次数据管道运行一行，提供数据溯源';

-- 5) Entity-resolution review queue for low-confidence matches
CREATE TABLE merge_review (
    id          BIGINT        NOT NULL AUTO_INCREMENT COMMENT '主键',
    candidate_a BIGINT        NOT NULL COMMENT '保留机构 id',
    candidate_b BIGINT        NOT NULL COMMENT '候选被并机构 id',
    match_rule  VARCHAR(32)   NOT NULL COMMENT '命中规则：IDENTIFIER/NAME_COUNTRY/FUZZY',
    match_score DECIMAL(5,4)  NULL COMMENT '匹配置信度 0~1',
    evidence    JSON          NULL COMMENT '命中证据（命中的代码/名称/来源）',
    status      VARCHAR(16)   NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING/MERGED/REJECTED',
    reviewed_by VARCHAR(100)  NULL COMMENT '复核人',
    reviewed_at DATETIME(6)   NULL COMMENT '复核时间',
    created_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    PRIMARY KEY (id),
    KEY idx_merge_review_status (status),
    CONSTRAINT fk_merge_review_a FOREIGN KEY (candidate_a) REFERENCES financial_institution (id),
    CONSTRAINT fk_merge_review_b FOREIGN KEY (candidate_b) REFERENCES financial_institution (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '实体合并复核队列：低置信度匹配由人工裁决';
