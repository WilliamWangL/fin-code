-- V15__comment_bank_identifier.sql
-- Documentation pass over bank_identifier (spec §15, FIN-002): the unified
-- identifier table that resolves an identifier (type + value) to its issuing
-- institution and branch. It currently backs GET /v1/sort-code, /v1/bsb,
-- /v1/ifsc and /v1/cnaps plus the /v1/lookup probing endpoint -- SWIFT/routing
-- (V11) and BIN (V12) moved to dedicated directory tables with external
-- enrichment and are no longer read from here.
-- The base V4 DDL predates the commented directory tables and carried no
-- COMMENT clauses. This migration only attaches metadata: every column
-- definition is restated verbatim from V4, nothing structural changes.

ALTER TABLE `bank_identifier`
  COMMENT = '银行标识符统一表：标识符（类型+值）→ 金融机构/分行解析（spec §15、FIN-002）；支撑 /v1/sort-code、/v1/bsb、/v1/ifsc、/v1/cnaps 查询与 /v1/lookup 探测；SWIFT/routing/BIN 已迁至独立目录表（V11/V12）',
  MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `institution_id` BIGINT NOT NULL COMMENT '所属金融机构 ID（financial_institution.id）',
  MODIFY COLUMN `branch_id` BIGINT NULL COMMENT '分行 ID（bank_branch.id），无分行级信息时为空',
  MODIFY COLUMN `identifier_type` VARCHAR(32) NOT NULL COMMENT '标识符类型（SORT_CODE/BSB/IFSC/CNAPS 等，对应 IdentifierType 枚举；SWIFT/ABA_ROUTING/BIN 已改查独立目录表）',
  MODIFY COLUMN `identifier_value` VARCHAR(64) NOT NULL COMMENT '标识符值（规范化后存储，如 BSB 去连字符后的 6 位数字）；(identifier_type, identifier_value) 全局唯一（spec §22）',
  MODIFY COLUMN `country_code` VARCHAR(2) NULL COMMENT '标识符所属国家/地区代码（ISO 3166-1 alpha-2）',
  MODIFY COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态（ACTIVE/INACTIVE/SUSPENDED/MERGED/CLOSED，对应 EntityStatus 枚举）',
  MODIFY COLUMN `source_id` BIGINT NULL COMMENT '数据来源 ID（data_source.id）',
  MODIFY COLUMN `valid_from` DATE NULL COMMENT '标识符生效日期',
  MODIFY COLUMN `valid_to` DATE NULL COMMENT '标识符失效日期',
  MODIFY COLUMN `verified_at` DATETIME(6) NULL COMMENT '最后核实时间',
  MODIFY COLUMN `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  MODIFY COLUMN `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间';
