-- Directory table backing the card BIN/IIN lookup (GET /v1/bin/{bin});
-- rows arrive from the external api-ninjas.com /v2/bin provider on local misses
-- or from bulk imports. IF NOT EXISTS keeps this migration a no-op on
-- environments where the table was created out-of-band.

CREATE TABLE IF NOT EXISTS `bank_bin_directory` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `bin` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'BIN/IIN 发卡行识别码（卡号前 6-8 位）',
  `brand` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '卡组织（Visa/Mastercard/American Express 等）',
  `type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '卡类型（credit/debit/charge card 等）',
  `categories` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '卡类别列表（逗号分隔，如 basic,classic）',
  `issuer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '发卡行名称',
  `country` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '发卡国家名称',
  `country_iso2` char(2) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '发卡国家代码 ISO 3166-1 alpha-2',
  `is_eu` tinyint(1) DEFAULT NULL COMMENT '是否欧盟成员',
  `is_eea` tinyint(1) DEFAULT NULL COMMENT '是否欧洲经济区成员',
  `is_sepa` tinyint(1) DEFAULT NULL COMMENT '是否 SEPA 区',
  `is_valid` tinyint(1) DEFAULT NULL COMMENT 'BIN 是否有效',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_bin` (`bin`) USING BTREE COMMENT 'BIN 唯一索引，防止数据重复'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC COMMENT='银行卡 BIN/IIN 发卡行识别码目录';
