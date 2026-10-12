-- Bank-code ↔ SWIFT/BIC mapping backing GET /v1/iban/{iban}: the national
-- bank code extracted from an IBAN's BBAN resolves to the institution's
-- SWIFT code, which in turn serves the bank details from
-- bank_swift_code_directory. Rows arrive from the api-ninjas.com /v1/iban
-- provider on local misses or from bulk imports. IF NOT EXISTS keeps this
-- migration a no-op on environments where the table was created out-of-band.

CREATE TABLE IF NOT EXISTS `iban_bank_code_map` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `country_code` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'IBAN 国家代码 ISO 3166-1 alpha-2',
  `bank_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'IBAN BBAN 中的银行识别码（各国国内清算码，如德国 BLZ）',
  `swift_code` varchar(11) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '该银行对应的 SWIFT/BIC 代码',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_iban_bank_code_map` (`country_code`, `bank_code`) USING BTREE COMMENT '国家+银行代码唯一，防数据重复',
  KEY `idx_iban_bank_code_map_swift` (`swift_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC COMMENT='IBAN 银行识别码与 SWIFT/BIC 映射目录';
