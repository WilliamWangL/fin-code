# Global Financial Information API
## 全球金融信息 API 平台产品方案 + 技术开发文档

**文档版本：V1.0**  
**产品定位：Global Financial Data & Bank Identifier API Platform**  
**目标市场：全球开发者 / FinTech / Payment / E-commerce / ERP / SaaS / 财务团队**

---

# 1. 产品概述

## 1.1 产品名称

暂定：

**GlobalBankData**

也可以考虑：

- BankCode API
- FinCode
- BankData
- GlobalBankAPI
- BankIdentifier
- FinData API
- PayCode
- BankCodes
- Global Financial Data

最终品牌建议采用：

> **品牌名 + Financial Data API**

例如：

> GlobalBankData — Global Financial Data API

---

# 2. 产品定位

产品不是简单的：

> IBAN Checker

而是：

> **全球银行识别码、银行机构信息、账户格式、支付代码和金融机构数据 API 平台。**

提供：

```text
IBAN
SWIFT / BIC
Routing Number
Sort Code
BSB
IFSC
CNAPS
Bank Code
Clearing Code
Bank Directory
Branch Directory
Country Banking Data
Currency Data
Financial Institution Data
API
```

---

# 3. 核心用户

## 3.1 Developer

需要：

```text
验证 IBAN
查询 SWIFT
查询银行
查询 Routing Number
查询银行地址
识别国家
识别银行
```

例如：

```http
GET /v1/iban/validate/DE89370400440532013000
```

---

## 3.2 FinTech

例如：

- Payment Gateway
- Money Transfer
- Wallet
- Neobank
- Remittance
- FX Platform

需要：

```text
Bank verification
Account validation
Bank identification
Payment routing
```

---

## 3.3 跨境电商

例如：

- Shopify App
- Amazon Seller SaaS
- Stripe App
- Payoneer 类平台
- ERP

用于：

```text
收款账户验证
供应商账户验证
付款账户检查
银行信息补全
```

---

## 3.4 企业财务

例如：

```text
ERP
Accounting
Treasury
AP/AR
Payroll
```

用于：

```text
Bank master data
Payment validation
Beneficiary validation
```

---

# 4. 产品整体结构

```text
                    Global Financial Data
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
       Web                 API                Data
        │                   │                   │
   SEO Tools          REST API             Bank DB
        │              API Key             Branch DB
        │              Usage               Code DB
        │              Billing              Country DB
        │
        ├── IBAN Checker
        ├── SWIFT Lookup
        ├── Routing Lookup
        ├── Sort Code Lookup
        ├── BSB Lookup
        ├── IFSC Lookup
        ├── CNAPS Lookup
        └── Bank Search
```

---

# 5. 官网产品结构

## 5.1 Homepage

URL：

```text
/
```

首页核心文案：

> Global Banking Data API

> Validate IBANs, find SWIFT/BIC codes, routing numbers, bank branches and financial institution information through one simple API.

核心搜索框：

```text
Search bank, SWIFT, IBAN, routing number...
```

例如：

```text
ICBC
ICBKCNBJ
021000021
DE89370400440532013000
```

---

# 6. 官网导航

```text
Products
    IBAN Validator
    SWIFT/BIC Lookup
    Routing Number Lookup
    Sort Code Lookup
    BSB Lookup
    IFSC Lookup
    CNAPS Lookup
    Bank Directory

Developers
    API
    Documentation
    API Reference
    SDKs
    Changelog
    Status

Resources
    Bank Directory
    Country Directory
    Banking Guides
    Code Guides

Pricing

Sign In
Get API Key
```

---

# 7. 官网核心页面

## 7.1 IBAN Checker

```text
/iban-checker
```

输入：

```text
Enter IBAN
[ DE89 3704 0044 0532 0130 00 ]

[Validate]
```

输出：

```text
Valid IBAN

Country:
Germany

Country Code:
DE

Check Digits:
89

Bank Code:
37040044

Account Number:
0532013000

Length:
22

Bank:
Commerzbank / Bank Institution
```

注意：

> IBAN 格式和校验成功并不等于银行账户真实存在。

页面必须明确区分：

```text
Format Valid
Checksum Valid
Bank Identified
Account Existence
```

---

# 8. SWIFT/BIC Lookup

URL：

```text
/swift-codes
```

输入：

```text
ICBKCNBJ
```

输出：

```text
SWIFT / BIC

ICBKCNBJ

Bank:
Industrial and Commercial Bank of China

Country:
China

Country Code:
CN

Location:
BJ

BIC Length:
8

Status:
...
```

BIC 标准为 ISO 9362；BIC 可以是 8 位，也可以附加 3 位 branch identifier 构成 11 位。

---

# 9. Routing Number Lookup

URL：

```text
/routing-numbers
```

输入：

```text
021000021
```

输出：

```text
Routing Number

021000021

Bank:
JPMorgan Chase Bank

Country:
United States

State:
New York

Routing Type:
ACH / Wire
```

这里必须特别注意数据授权。

ABA 官方说明 Routing Number 的官方注册机构是 LexisNexis Risk Solutions，同时 ABA 查询服务条款限制了数据的发布、再分发和存储。因此商业 API 不应该简单抓 ABA 网站后长期缓存并出售，而应获得适当的数据授权或采用合规的数据供应商。

---

# 10. Sort Code

URL：

```text
/sort-codes
```

例如：

```text
20-00-00
```

输出：

```text
Sort Code
20-00-00

Bank:
Barclays

Country:
United Kingdom

Bank Code:
20

Branch:
...
```

---

# 11. BSB

URL：

```text
/bsb
```

例如：

```text
062-001
```

输出：

```text
BSB:
062001

Bank:
Commonwealth Bank

State:
NSW

Branch:
...
```

---

# 12. IFSC

URL：

```text
/ifsc
```

例如：

```text
SBIN0001234
```

输出：

```text
IFSC:
SBIN0001234

Bank:
State Bank of India

Branch:
...

City:
...

State:
...
```

---

# 13. CNAPS

中国大陆重点支持：

```text
CNAPS
支付系统行号
联行号
银行代码
银行网点
```

例如：

```text
/china/cnaps
```

输入：

```text
102xxxxxxxxx
```

输出：

```text
CNAPS

102xxxxxxxxx

Bank:
中国工商银行

Branch:
上海某支行

Province:
Shanghai

City:
Shanghai

Status:
Active
```

---

# 14. Bank Directory

这是整个产品最重要的页面之一。

URL：

```text
/banks
```

结构：

```text
Countries
    United States
    United Kingdom
    China
    Germany
    France
    India
    Australia
    Canada
    Singapore
    Hong Kong
    Japan
```

国家：

```text
United States
    Banks
    Branches
    Routing Numbers
    SWIFT Codes
```

银行：

```text
JPMorgan Chase Bank

Overview

SWIFT Codes
Routing Numbers
Branches
Address
Country
State
City
```

---

# 15. Bank Entity 数据模型

不要把银行直接当成 SWIFT/BIC。

建议建立统一的：

```text
Financial Institution Entity
```

例如：

```text
Institution
    ↓
Bank
    ↓
Branch
    ↓
Identifiers
```

---

# 16. 核心数据库模型

## 16.1 financial_institution

```sql
CREATE TABLE financial_institution (
    id BIGINT PRIMARY KEY,
    legal_name VARCHAR(255),
    name_en VARCHAR(255),
    name_local VARCHAR(255),
    short_name VARCHAR(100),

    country_code CHAR(2),
    institution_type VARCHAR(50),

    website VARCHAR(500),

    status VARCHAR(30),

    created_at DATETIME,
    updated_at DATETIME
);
```

---

# 17. bank_branch

```sql
CREATE TABLE bank_branch (
    id BIGINT PRIMARY KEY,

    institution_id BIGINT NOT NULL,

    branch_name VARCHAR(255),
    branch_name_en VARCHAR(255),

    address VARCHAR(500),

    city VARCHAR(100),
    state VARCHAR(100),
    province VARCHAR(100),

    postal_code VARCHAR(30),

    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    phone VARCHAR(50),

    status VARCHAR(30),

    created_at DATETIME,
    updated_at DATETIME
);
```

---

# 18. bank_identifier

统一保存所有代码。

```sql
CREATE TABLE bank_identifier (
    id BIGINT PRIMARY KEY,

    institution_id BIGINT,
    branch_id BIGINT,

    identifier_type VARCHAR(50),
    identifier_value VARCHAR(100),

    country_code CHAR(2),

    status VARCHAR(30),

    source_id BIGINT,

    valid_from DATE,
    valid_to DATE,

    verified_at DATETIME,

    created_at DATETIME,
    updated_at DATETIME,

    UNIQUE KEY uk_identifier (
        identifier_type,
        identifier_value
    )
);
```

identifier_type：

```text
SWIFT
BIC
IBAN_BANK_CODE
ABA_ROUTING
SORT_CODE
BSB
IFSC
CNAPS
CLEARING_CODE
BANK_CODE
TRANSIT_NUMBER
INSTITUTION_CODE
```

---

# 19. Country 表

```sql
country
```

字段：

```text
id
iso2
iso3
numeric_code
name_en
name_local
currency
iban_supported
swift_supported
local_code_type
iban_length
iban_structure
status
```

---

# 20. IBAN Format

这一层不要放到 bank 表。

因为 IBAN 的国家格式属于：

> Country Level Format

例如：

```text
Germany
DE
Length = 22
Structure = DE2!n8!n10!n
```

SWIFT 官方发布 ISO 13616 IBAN Registry，包含符合 ISO 13616 的国家 IBAN 格式，并持续发布更新版本。2026 年 6 月的官方资源已经发布 Release 102。

数据库：

```sql
iban_country_format
```

字段：

```text
country_code
iban_length
bban_length
structure
example
check_digits_position
bank_identifier_position
branch_identifier_position
account_number_position
version
effective_date
```

---

# 21. API 产品设计

API Base URL：

```text
https://api.example.com/v1
```

认证：

```http
Authorization: Bearer sk_live_xxxxxxxxx
```

或者：

```http
X-API-Key: sk_live_xxxxxxxxx
```

推荐：

> Bearer API Key

---

# 22. API 分类

```text
Validation APIs

GET /iban/validate
GET /swift/validate
GET /routing/validate
GET /sort-code/validate
GET /bsb/validate
GET /ifsc/validate
GET /cnaps/validate
```

Lookup APIs：

```text
GET /swift/{code}
GET /routing/{number}
GET /sort-code/{code}
GET /bsb/{code}
GET /ifsc/{code}
GET /cnaps/{code}
```

Bank：

```text
GET /banks
GET /banks/{id}
GET /banks/search
GET /banks/{id}/branches
```

Country：

```text
GET /countries
GET /countries/{country}
GET /countries/{country}/iban-format
```

---

# 23. IBAN API

## Validate

```http
GET /v1/iban/validate?iban=DE89370400440532013000
```

Response：

```json
{
  "valid": true,
  "iban": "DE89370400440532013000",
  "country": {
    "code": "DE",
    "name": "Germany"
  },
  "check_digits": "89",
  "bank_code": "37040044",
  "account_number": "0532013000",
  "length": 22,
  "checksum": {
    "valid": true,
    "algorithm": "MOD97"
  }
}
```

---

# 24. SWIFT API

```http
GET /v1/swift/ICBKCNBJ
```

Response：

```json
{
  "code": "ICBKCNBJ",
  "type": "BIC8",
  "valid": true,

  "institution": {
    "id": "inst_xxx",
    "name": "Industrial and Commercial Bank of China"
  },

  "country": {
    "code": "CN",
    "name": "China"
  },

  "location_code": "BJ",

  "status": "active",

  "last_verified_at": "2026-09-01"
}
```

---

# 25. Routing API

```http
GET /v1/routing/021000021
```

Response：

```json
{
  "routing_number": "021000021",
  "valid": true,

  "institution": {
    "name": "..."
  },

  "country": "US",

  "routing_types": [
    "ACH",
    "WIRE"
  ],

  "status": "active"
}
```

---

# 26. Bank Search API

```http
GET /v1/banks/search?q=chase
```

Response：

```json
{
  "data": [
    {
      "id": "bank_xxx",
      "name": "JPMorgan Chase Bank",
      "country": "US",
      "swift": [
        "..."
      ]
    }
  ],
  "meta": {
    "total": 1
  }
}
```

---

# 27. Universal Lookup API

可以提供一个非常有价值的 API：

```http
GET /v1/lookup?q=ICBKCNBJ
```

系统自动识别：

```text
SWIFT
BIC
Routing
Sort Code
BSB
IFSC
CNAPS
IBAN
```

返回：

```json
{
  "query": "ICBKCNBJ",

  "detected_type": "SWIFT",

  "matches": [
    {
      "identifier_type": "SWIFT",
      "value": "ICBKCNBJ",
      "institution": {
        "name": "Industrial and Commercial Bank of China"
      }
    }
  ]
}
```

这是官网搜索框和 API 都可以共用的能力。

---

# 28. API Pricing

建议不要一开始定得太贵。

## Free

```text
$0

500 requests/month
1 API key
Basic validation
Community support
```

---

## Developer

```text
$19/month

20,000 requests
IBAN
SWIFT
Routing
Sort Code
BSB
IFSC
CNAPS
```

---

## Startup

```text
$49/month

100,000 requests
Higher rate limit
Bank Directory
Branch data
Email support
```

---

## Business

```text
$149/month

500,000 requests
Priority API
Advanced data
Webhook
Bulk lookup
```

---

## Enterprise

```text
Custom

1M+
Dedicated support
SLA
Custom data
Private endpoint
Bulk database
```

---

# 29. API 用量计费

数据库：

```text
api_plan
```

```text
api_subscription
```

```text
api_usage
```

每次请求记录：

```text
api_key_id
endpoint
method
country
identifier_type
status_code
response_time
request_date
```

但是：

> 不建议永久保存用户提交的完整 IBAN。

应该默认：

```text
hash(input)
```

或者只保存：

```text
country
identifier_type
masked_identifier
```

例如：

```text
DE89****************3000
```

---

# 30. API Key

```text
pk_test_xxxxxxxxx
sk_test_xxxxxxxxx

pk_live_xxxxxxxxx
sk_live_xxxxxxxxx
```

数据库：

```text
api_key
```

```text
id
user_id
name
key_prefix
key_hash
environment
status
rate_limit
monthly_limit
created_at
last_used_at
expires_at
```

API Key 数据库中只保存：

> hash

而不是明文 Key。

---

# 31. Rate Limit

推荐 Redis：

```text
Token Bucket
```

例如：

Free：

```text
10 req/min
```

Developer：

```text
60 req/min
```

Startup：

```text
300 req/min
```

Business：

```text
1000 req/min
```

Enterprise：

```text
custom
```

---

# 32. API 架构

推荐：

```text
                     Cloudflare
                         │
                         ↓
                  API Gateway
                         │
              ┌──────────┴──────────┐
              ↓                     ↓
         Rate Limiter            Auth
              │
              ↓
          API Service
              │
       ┌──────┼────────┐
       ↓      ↓        ↓
     Redis  MySQL   Search
       │      │        │
       └──────┼────────┘
              ↓
         Data Service
              ↓
        Data Providers
```

---

# 33. 技术栈建议

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
next-intl
```

SEO：

```text
SSR
SSG
ISR
Schema.org
sitemap.xml
robots.txt
```

---

# 34. API Backend

推荐：

```text
Java 21
Spring Boot 3
Spring Cloud
```

或者如果追求开发速度：

```text
Go
Gin / Fiber
```

我更推荐：

> **Java + Spring Boot**

因为后面数据处理、后台管理、任务系统、权限体系比较复杂。

---

# 35. 数据层

核心：

```text
MySQL 8
```

缓存：

```text
Redis
```

搜索：

```text
OpenSearch / Elasticsearch
```

对象存储：

```text
S3 / OSS
```

消息队列：

```text
Kafka
```

任务：

```text
XXL-JOB
```

---

# 36. 推荐数据库架构

```text
MySQL
│
├── institution
├── branch
├── identifier
├── country
├── country_iban_format
├── currency
├── source
├── data_version
└── data_change
```

Redis：

```text
identifier lookup
bank lookup
country lookup
API rate limit
```

OpenSearch：

```text
bank search
branch search
identifier search
autocomplete
```

---

# 37. 数据源体系

这是整个项目最重要的部分。

必须建立：

```text
Official Source
     ↓
Licensed Provider
     ↓
Public Source
     ↓
Community Source
     ↓
Internal Verification
```

每条数据必须记录：

```text
source
source_type
source_url
license
retrieved_at
verified_at
confidence
```

---

# 38. IBAN 数据

IBAN 国家格式优先使用官方 Registry。

SWIFT 官方明确说明其维护 ISO 13616 IBAN Registry，并提供 TXT/XLSX/ZIP/PDF 等版本；2026 年 6 月已经有 Release 102。

因此：

```text
SWIFT IBAN Registry
        ↓
Raw
        ↓
Parser
        ↓
iban_country_format
```

---

# 39. BIC 数据

BIC 数据建议采用：

```text
Licensed SWIFT/BIC data
```

作为商业核心数据源。

SWIFT 官方 BIC 数据记录包括：

```text
Legal Name
Registered Address
Status
Publication Date
Last Update
Expiry Date
```

并要求 BIC owner 至少每年确认数据准确性。

所以你的数据模型可以保存：

```text
publication_date
last_update_date
expiry_date
status
```

---

# 40. 美国 Routing Number

不要：

```text
爬 ABA
↓
保存
↓
卖 API
```

而应该：

```text
ABA / LexisNexis
        ↓
Commercial License
        ↓
Data Pipeline
        ↓
Your Database
```

或者寻找获得授权的商业数据供应商。

ABA 官方服务条款明确限制未经适当许可对 ABA RTN 数据进行发布、分发、存储和商业服务化。

---

# 41. 中国大陆

中国：

```text
CNAPS
Bank Code
Branch
SWIFT
PBOC Institution Code
```

建议建立：

```text
Official / Licensed
+
Bank official websites
+
Licensed data provider
+
Public datasets
```

数据结构：

```text
China Bank
    │
    ├── Bank Code
    ├── CNAPS
    ├── PBOC Code
    ├── SWIFT
    └── Branch
```

中国大陆应该单独做成一个 Data Domain。

---

# 42. 数据采集系统

建立 Data Pipeline：

```text
                    Source
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       Official    Licensed     Public
          │           │           │
          └───────────┼───────────┘
                      ↓
                  Raw Data
                      ↓
                   Parser
                      ↓
                Normalization
                      ↓
                  Deduplication
                      ↓
                 Validation
                      ↓
                Entity Matching
                      ↓
                  QA Review
                      ↓
                  Production
```

---

# 43. 数据版本

每次数据更新生成：

```text
Data Version
```

例如：

```text
IBAN-2026-09-01
BIC-2026-09
CNAPS-2026-09
IFSC-2026-09
```

数据库：

```text
data_version
```

字段：

```text
id
dataset
version
source
record_count
created_at
published_at
```

---

# 44. 数据质量等级

每条数据增加：

```text
confidence
```

例如：

```text
100 = Official
95  = Licensed Provider
85  = Bank Website
70  = Verified Public
50  = Community
```

API 可以返回：

```json
{
  "data_quality": {
    "confidence": 100,
    "source_type": "official",
    "last_verified_at": "2026-09-01"
  }
}
```

---

# 45. 官网 SEO 策略

这是这个项目非常重要的获客渠道。

核心：

> Programmatic SEO

---

# 46. SEO 页面矩阵

## IBAN

```text
/iban/{country}
/iban/{country}/format
/iban/{country}/validator
```

例如：

```text
/iban/germany
/iban/france
/iban/spain
```

---

# 47. SWIFT

```text
/swift-codes/{country}
/swift-codes/{bank}
/swift-codes/{code}
```

例如：

```text
/swift-codes/china
/swift-codes/icbc
/swift-codes/ICBKCNBJ
```

---

# 48. Routing

```text
/routing-numbers/{number}
/routing-numbers/{bank}
/routing-numbers/{state}/{bank}
```

---

# 49. IFSC

```text
/ifsc/{code}
/ifsc/{bank}
/ifsc/{state}
/ifsc/{city}
```

---

# 50. CNAPS

```text
/cnaps/{code}
/cnaps/{bank}
/cnaps/{province}
/cnaps/{city}
```

---

# 51. Bank 页面

例如：

```text
/banks/jpmorgan-chase
```

页面包含：

```text
Bank Overview

SWIFT Codes

Routing Numbers

Branches

Addresses

Countries

Related Bank Codes
```

这会成为 SEO 的核心实体页。

---

# 52. 自动 SEO 页面生成

数据：

```text
Bank
Country
Code
Branch
```

自动生成：

```text
Title
H1
Description
Content
FAQ
Breadcrumb
Schema
Internal Links
```

例如：

```text
JPMorgan Chase Routing Numbers
```

自动生成：

```text
JPMorgan Chase routing numbers and bank information.
Find routing numbers, SWIFT/BIC codes, branches and related banking information.
```

---

# 53. Schema.org

建议使用：

```text
Organization
FinancialService
BankOrCreditUnion
FAQPage
BreadcrumbList
WebApplication
```

API 文档页面：

```text
SoftwareApplication
TechArticle
```

---

# 54. Developer Portal

URL：

```text
/developers
```

包括：

```text
Documentation
Quickstart
Authentication
API Reference
Errors
Rate Limits
SDK
Webhooks
Changelog
Status
```

---

# 55. Quick Start

例如：

```bash
curl \
  -H "Authorization: Bearer sk_live_xxx" \
  "https://api.example.com/v1/iban/validate?iban=DE89370400440532013000"
```

返回：

```json
{
  "valid": true
}
```

---

# 56. SDK

第一阶段：

```text
JavaScript
Python
PHP
Java
Go
Ruby
```

例如：

```javascript
const client = new GlobalBankData({
  apiKey: process.env.API_KEY
});

const result =
  await client.iban.validate(
    "DE89370400440532013000"
  );
```

---

# 57. API Error 标准

统一：

```json
{
  "error": {
    "code": "INVALID_IBAN",
    "message": "The IBAN format is invalid",
    "request_id": "req_xxxxxxxxx"
  }
}
```

错误：

```text
INVALID_REQUEST
INVALID_IBAN
INVALID_SWIFT
INVALID_ROUTING
NOT_FOUND
RATE_LIMIT_EXCEEDED
UNAUTHORIZED
FORBIDDEN
API_KEY_EXPIRED
DATA_UNAVAILABLE
INTERNAL_ERROR
```

---

# 58. Request ID

所有 API：

```http
X-Request-ID: req_01ABC...
```

方便客户排查问题。

---

# 59. API Documentation

建议使用：

```text
OpenAPI 3.1
```

生成：

```text
Swagger
Scalar
Redoc
```

最终：

```text
/docs
```

---

# 60. Admin 后台

后台：

```text
/admin
```

模块：

```text
Dashboard

Data
    Institutions
    Branches
    Identifiers
    Countries
    IBAN Formats

Data Sources
    Providers
    Imports
    Versions
    Errors

API
    Users
    API Keys
    Usage
    Requests

Billing
    Plans
    Subscriptions
    Payments

System
    Jobs
    Logs
    Settings
```

---

# 61. 数据管理后台

管理员可以：

```text
搜索银行
编辑银行
编辑 Branch
修改 SWIFT
修改 Routing
修改 CNAPS
查看来源
查看更新时间
查看数据历史
回滚
```

---

# 62. Data Change Log

例如：

```text
ICBC
SWIFT
ICBKCNBJ

Old:
ICBKCNBJXXX

New:
ICBKCNBJ

Changed:
2026-09-01

Source:
Official

Operator:
system
```

---

# 63. API Dashboard

用户登录：

```text
Dashboard
```

看到：

```text
API Requests
████████████

18,230 / 100,000

Remaining:
81,770
```

统计：

```text
Requests
Errors
Latency
Endpoints
Countries
Status
```

---

# 64. Billing

推荐：

```text
Stripe
```

支持：

```text
Subscription
Upgrade
Downgrade
Invoice
Payment Method
Usage
```

API 额度：

```text
monthly quota
```

---

# 65. 用户系统

```text
User
Organization
Workspace
API Key
Subscription
```

关系：

```text
User
 ↓
Organization
 ↓
Project
 ↓
API Key
 ↓
Usage
```

这样未来支持团队账户。

---

# 66. Multi-Tenant

数据库：

```text
organization
organization_member
project
api_key
subscription
usage
```

一个公司可以：

```text
Acme
 ├── Production
 ├── Development
 └── Test
```

---

# 67. 安全

必须：

```text
HTTPS
JWT
API Key Hash
RBAC
Rate Limit
WAF
IP restriction
Audit Log
```

敏感数据：

```text
IBAN
Bank Account
API Key
```

都不能明文进入普通日志。

---

# 68. IBAN 隐私

特别注意：

> IBAN 是金融账户标识，不应该为了统计而长期保存用户完整输入。

日志：

```text
DE89370400440532013000
```

应该转换成：

```text
DE89****************3000
```

或者：

```text
SHA256(input)
```

---

# 69. API 性能目标

V1：

```text
P50 < 50ms
P95 < 150ms
P99 < 300ms
```

缓存命中：

```text
P95 < 50ms
```

可用性：

```text
99.9%
```

Enterprise：

```text
99.99%
```

---

# 70. 数据库性能

Identifier 查询必须：

```text
O(1)
```

核心索引：

```sql
UNIQUE(identifier_type, identifier_value)
```

例如：

```text
SWIFT + ICBKCNBJ
```

直接定位：

```text
institution_id
```

---

# 71. Search Engine

OpenSearch：

```text
bank name
branch
city
country
identifier
```

支持：

```text
ICBC
Industrial Commercial Bank
中国工商银行
工商
ICBKCNBJ
```

返回统一 Entity。

---

# 72. Autocomplete

官网搜索：

```text
ICB
```

实时：

```text
Industrial and Commercial Bank of China
ICBKCNBJ
China
```

搜索：

```text
Chase
```

返回：

```text
JPMorgan Chase Bank
United States
```

---

# 73. API 与 Web 共用核心服务

不要：

```text
Website
    ↓
独立查询代码

API
    ↓
另一套查询代码
```

应该：

```text
                 Data Service
                /            \
               /              \
           Website            API
```

统一：

```text
BankResolver
IdentifierResolver
IBANValidator
BICResolver
RoutingResolver
```

---

# 74. 核心 Domain Service

```text
IdentifierResolver

resolve(type, value)

↓

Identifier
    ↓
Institution
    ↓
Branch
    ↓
Country
```

---

# 75. IBAN Validator

算法：

```text
Normalize
    ↓
Country Check
    ↓
Length Check
    ↓
Character Check
    ↓
Move First 4 Characters
    ↓
MOD-97
    ↓
Country Structure
    ↓
Parse BBAN
```

需要支持：

```text
IBAN format validation
Checksum validation
Country validation
BBAN parsing
Bank code extraction
```

但不能声称：

> “验证账户真实存在”

除非未来接入真正的账户验证服务。

---

# 76. 数据同步

每天：

```text
00:00
    ↓
Fetch Sources
    ↓
Download
    ↓
Checksum
    ↓
Parse
    ↓
Normalize
    ↓
Compare
    ↓
Diff
    ↓
QA
    ↓
Publish
```

---

# 77. Data Diff

每天产生：

```text
NEW
UPDATED
REMOVED
REACTIVATED
```

例如：

```text
NEW: 1,235

UPDATED: 542

REMOVED: 89
```

管理员审核：

```text
Approve
Reject
```

---

# 78. 数据状态

```text
ACTIVE
INACTIVE
SUSPENDED
EXPIRED
UNKNOWN
```

---

# 79. 数据 Source

```text
source
```

例如：

```text
SWIFT
CENTRAL_BANK
BANK
LICENSED_PROVIDER
PUBLIC_DATA
COMMUNITY
MANUAL
```

---

# 80. Data Provenance

每一条数据：

```json
{
  "source": {
    "type": "official",
    "provider": "SWIFT",
    "retrieved_at": "2026-09-01",
    "verified_at": "2026-09-02"
  }
}
```

这是未来 Enterprise 客户非常看重的能力。

---

# 81. API 数据可信度

API 可以返回：

```json
{
  "data_quality": {
    "source": "official",
    "confidence": 100,
    "last_verified_at": "2026-09-01"
  }
}
```

但对客户展示的“confidence=100”需要有明确内部规则，不能仅仅是营销数字。

---

# 82. 法务与免责声明

官网必须明确：

> This service provides financial reference data for informational and software integration purposes. Data may change and should be independently verified before initiating financial transactions.

不要承诺：

```text
100% accurate
Guaranteed payment
Guaranteed bank account exists
Guaranteed transaction success
```

---

# 83. 数据授权策略

这是项目必须单独成立一个模块：

```text
Data Licensing
```

每种数据记录：

```text
provider
license
commercial_use
redistribution
storage
API_resale
attribution_required
```

例如：

```text
SWIFT
    commercial license required

ABA RTN
    commercial license required

IBAN format
    registry/reference

Bank website
    individual source terms
```

不能因为：

> “Google 能搜到”

就默认：

> “可以放到 API 卖给客户”。

---

# 84. V1 不要一次做完所有国家

建议分三阶段。

## Phase 1

重点：

```text
IBAN
SWIFT/BIC
US Routing
UK Sort Code
Australia BSB
India IFSC
China CNAPS
Bank Directory
```

---

# 85. Phase 2

增加：

```text
Canada Transit
Hong Kong Clearing Code
Singapore Bank Code
Japan Zengin
Germany BLZ
France Bank Code
Spain Bank Code
Italy ABI/CAB
Brazil COMPE/ISPB
Mexico CLABE
```

---

# 86. Phase 3

增加：

```text
LEI
CHIPS UID
Fedwire
SEPA
TARGET
CHAPS
ACH
Payment scheme data
ISO 20022 identifiers
```

SWIFT 的 Identifiers Directory 本身也覆盖包括 BIC、CHIPS UID、national clearing codes 和 IBAN 相关信息在内的多种机构标识，因此未来可以把产品从“银行代码查询”扩展到更完整的金融机构 Identifier Data。

---

# 87. MVP

真正开发时，我建议第一版只做：

```text
① IBAN Validator

② SWIFT/BIC Lookup

③ Routing Number Lookup

④ Bank Directory

⑤ Country Directory

⑥ API

⑦ API Key

⑧ Pricing

⑨ Developer Documentation

⑩ Admin
```

同时数据层预留：

```text
Sort Code
BSB
IFSC
CNAPS
```

---

# 88. MVP 官网页面

```text
/
 /iban-checker
 /swift-codes
 /routing-numbers
 /banks
 /countries
 /pricing
 /developers
 /docs
 /about
 /contact
```

---

# 89. MVP API

```text
GET /v1/iban/validate

GET /v1/swift/{code}

GET /v1/routing/{number}

GET /v1/banks/search

GET /v1/banks/{id}

GET /v1/countries

GET /v1/countries/{code}
```

---

# 90. MVP 开发顺序

### Sprint 1

```text
Project
Database
User
Organization
Authentication
Admin
```

### Sprint 2

```text
Country
Institution
Branch
Identifier
IBAN Format
```

### Sprint 3

```text
IBAN Validator
SWIFT Lookup
Routing Lookup
Bank Search
```

### Sprint 4

```text
API Gateway
API Key
Rate Limit
Usage
```

### Sprint 5

```text
Developer Portal
Documentation
Pricing
Stripe
```

### Sprint 6

```text
SEO
Sitemap
Programmatic Pages
Schema
Performance
```

---

# 91. 推荐项目代码结构

```text
global-financial-api
│
├── apps
│   ├── web
│   ├── api
│   └── admin
│
├── services
│   ├── institution
│   ├── identifier
│   ├── iban
│   ├── swift
│   ├── routing
│   ├── search
│   ├── billing
│   └── usage
│
├── data-pipeline
│   ├── iban
│   ├── swift
│   ├── routing
│   ├── cnaps
│   ├── ifsc
│   └── sort-code
│
├── sdk
│   ├── javascript
│   ├── python
│   ├── java
│   └── go
│
└── infrastructure
    ├── docker
    ├── k8s
    ├── nginx
    └── terraform
```

---

# 92. 云架构

MVP：

```text
Cloudflare
    ↓
Nginx
    ↓
Next.js
    ↓
Spring Boot
    ↓
MySQL
Redis
```

成长：

```text
Cloudflare
     ↓
Load Balancer
     ↓
Kubernetes
     │
 ┌───┼────────┐
 ↓   ↓        ↓
API Search Data
 │    │        │
 └────┼────────┘
      ↓
 MySQL Cluster
 Redis Cluster
 OpenSearch
 Kafka
```

---

# 93. 监控

使用：

```text
Prometheus
Grafana
Loki
Sentry
OpenTelemetry
```

监控：

```text
API latency
API errors
DB latency
Redis
Search
Data pipeline
Data freshness
```

---

# 94. Status Page

官网：

```text
/status
```

显示：

```text
API              Operational
IBAN API         Operational
SWIFT API        Operational
Routing API      Operational
Search           Operational
Dashboard        Operational
```

未来可做：

> status.example.com

---

# 95. 最核心的商业飞轮

整个产品真正的增长模型：

```text
Google Search
       ↓
Free Tool
       ↓
Bank / Code Page
       ↓
Developer
       ↓
API
       ↓
Free API
       ↓
Paid API
       ↓
Enterprise
```

同时：

```text
Bank Database
       ↓
SEO Pages
       ↓
Traffic
       ↓
Developers
       ↓
API Customers
       ↓
Revenue
       ↓
More Data
```

---

# 96. 最重要的竞争壁垒

不是：

```text
Next.js
Spring Boot
MySQL
```

这些都很容易复制。

真正壁垒：

### 第一

```text
Data Coverage
```

### 第二

```text
Data Freshness
```

### 第三

```text
Data Licensing
```

### 第四

```text
Entity Resolution
```

例如：

```text
ICBC
中国工商银行
Industrial and Commercial Bank of China
ICBK
ICBKCNBJ
102
```

最终全部关联：

```text
Institution ID = inst_123
```

### 第五

```text
API Reliability
```

### 第六

```text
SEO Bank Directory
```

---

# 97. 最终产品结构

最终形成：

```text
                    GLOBAL FINANCIAL DATA
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
     Consumer               Developer             Enterprise
        │                     │                      │
     Website                 API                 Bulk Data
        │                     │                      │
 ┌──────┼──────┐       ┌──────┼──────┐       ┌──────┼──────┐
 │      │      │       │      │      │       │      │      │
IBAN   SWIFT Bank    Validate Lookup Search  CSV    API    DB
 │      │      │       │      │      │       │      │      │
 └──────┴──────┘       └──────┴──────┘       └──────┴──────┘
                              │
                         Data Platform
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                 Bank DB   Code DB   Country DB
                    │         │         │
                    └─────────┼─────────┘
                              │
                        Data Pipeline
                              │
                Official / Licensed / Public
```

---

# 98. 我建议的第一版产品定位

首页不要写：

> IBAN Checker

而应该写：

> **Global Financial Data API**

副标题：

> **Bank identifiers, account formats and financial institution data — available through one simple API.**

下面展示：

```text
IBAN
SWIFT / BIC
Routing Number
Sort Code
BSB
IFSC
CNAPS
Bank Directory
```

CTA：

```text
Get Started
```

第二 CTA：

```text
Explore Bank Directory
```

---

# 99. 第一阶段商业目标

不要一开始追求：

```text
100万用户
```

更实际的是：

```text
10,000 organic visitors
        ↓
500 registered users
        ↓
100 API users
        ↓
10 paying customers
```

然后观察：

```text
哪个国家流量最大
哪个 API 使用最多
哪个国家数据需求最大
哪个关键词转化最好
```

再决定数据采购投入。

---

# 100. 最终建议

这个项目应该按照三个产品来开发：

## 产品 A：免费工具站

```text
IBAN Checker
SWIFT Lookup
Routing Lookup
Bank Search
```

负责：

> **SEO + 流量**

---

## 产品 B：Bank Directory

```text
Countries
Banks
Branches
Identifiers
```

负责：

> **数据资产 + SEO**

---

## 产品 C：Financial Data API

```text
IBAN API
SWIFT API
Routing API
Bank API
Branch API
Identifier API
```

负责：

> **真正商业化收入**

三者共享同一个：

```text
Global Financial Data Platform
```

---

# 101. 最终技术路线

```text
                ┌───────────────────┐
                │      Web SEO      │
                └─────────┬─────────┘
                          │
                ┌─────────▼─────────┐
                │   Search Service   │
                └─────────┬─────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │        Financial Data Core        │
        │                                   │
        │ Institution                       │
        │ Branch                            │
        │ Identifier                        │
        │ Country                           │
        │ IBAN Format                       │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
      MySQL             Redis          OpenSearch
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    Data Pipeline
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
    Official          Licensed           Public
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    Data QA / Diff
                          │
                    Production DB
                          │
                    ┌─────▼─────┐
                    │    API    │
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
            Free        Pro       Enterprise
```

---

# 102. V1 最重要的 5 件事

如果现在马上开始开发，我建议优先级严格按照：

**1. 数据模型**

```text
Institution
Branch
Identifier
Country
IBAN Format
Source
```

**2. 数据源和授权**

尤其是：

```text
SWIFT/BIC
ABA Routing
```

不要先写爬虫再考虑授权。

**3. API Core**

```text
IBAN
SWIFT
Routing
Bank
```

**4. Bank Directory SEO**

这是未来低成本获取用户的核心。

**5. API 商业化**

```text
API Key
Quota
Rate Limit
Usage
Stripe
Documentation
```

最终形成：

> **免费查询工具负责流量，Bank Directory 负责 SEO，API 负责收入，数据平台负责护城河。**