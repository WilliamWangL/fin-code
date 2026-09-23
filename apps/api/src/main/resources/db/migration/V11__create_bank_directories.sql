-- Directory tables backing the SWIFT/BIC and ABA routing lookups
-- (GET /v1/swift/{code}, GET /v1/routing/{number}); rows are loaded from the
-- external bank directory dataset. IF NOT EXISTS keeps this migration a no-op
-- on environments where the tables were created out-of-band.

CREATE TABLE IF NOT EXISTS `bank_routing_directory` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增主键，内部唯一标识',
  `routing_number` varchar(20) NOT NULL COMMENT '银行路由号码 (ABA Routing Number)，用于识别金融机构',
  `bank_name` varchar(255) DEFAULT NULL COMMENT '银行法定全称',
  `street_address` varchar(255) DEFAULT NULL COMMENT '详细办公或分支机构街道地址',
  `city` varchar(100) DEFAULT NULL COMMENT '所属城市',
  `state` varchar(50) DEFAULT NULL COMMENT '所属州/省份 (缩写或全称)',
  `zip_code` varchar(255) DEFAULT NULL COMMENT '邮政编码',
  `country` varchar(100) DEFAULT NULL COMMENT '国家名称 (如：USA)',
  `county` varchar(100) DEFAULT NULL COMMENT '所属县/区 (行政区划)',
  `timezone` varchar(50) DEFAULT NULL COMMENT '该地区所属时区 (如：PST, EST)',
  `latitude` decimal(10,7) DEFAULT NULL COMMENT '地理坐标：纬度',
  `longitude` decimal(11,7) DEFAULT NULL COMMENT '地理坐标：经度',
  `phone_number` varchar(50) DEFAULT NULL COMMENT '银行联系电话',
  `ach_supported` tinyint(1) DEFAULT '0' COMMENT '是否支持自动清算系统 (ACH)：1为支持，0为不支持',
  `fedwire_supported` tinyint(1) DEFAULT '0' COMMENT '是否支持美联储资金转账系统 (Fedwire)：1为支持，0为不支持',
  `checksum_valid` tinyint(1) DEFAULT '0' COMMENT '路由号码校验和是否通过算法验证',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_routing_number` (`routing_number`) USING BTREE COMMENT '路由号码唯一索引，防止数据重复'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='银行路由信息及网点详情表';

CREATE TABLE IF NOT EXISTS `bank_swift_code_directory` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `swift_code` varchar(11) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SWIFT/BIC 代码（8 或 11 位）',
  `bank_name` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '银行名称',
  `address` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '地址',
  `city` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '城市',
  `region` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '省/州/地区',
  `postal_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '邮编',
  `country` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '国家名称',
  `country_code` char(2) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '国家代码 ISO 3166-1 alpha-2',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_swift_code` (`swift_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC COMMENT='SWIFT 代码与银行信息';
