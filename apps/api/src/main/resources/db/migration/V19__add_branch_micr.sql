-- V19__add_branch_micr.sql
-- MICR 落库：IFSC 导入数据携带分行级 MICR（9 位印度清算码，Razorpay IFSC
-- 数据集覆盖 83.7%），bank_branch 之前没有承载列，导入时被丢弃。本迁移只
-- 新增可空列与索引，不改动既有列；历史行保持 NULL，由 IFSC 重新导入回填。

ALTER TABLE bank_branch
    ADD COLUMN micr VARCHAR(9) NULL COMMENT 'MICR（9 位印度清算码，分行级，来源 RBI/NPCI 名单）' AFTER postal_code,
    ADD KEY idx_bank_branch_micr (micr);
