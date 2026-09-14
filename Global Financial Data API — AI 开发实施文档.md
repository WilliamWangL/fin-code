# Global Financial Data API
## AI Coding Agent Development Specification

**Document Version:** 1.0  
**Project Type:** Global Financial Information & Bank Identifier API Platform  
**Target:** Cursor / Claude Code / Qoder / Codex / AI Coding Agent  
**Backend:** Java 21 + Spring Boot 3  
**Frontend:** Next.js + TypeScript  
**Database:** MySQL 8  
**Cache:** Redis  
**Search:** OpenSearch  
**Deployment:** Docker + Kubernetes  
**API Style:** REST API + OpenAPI 3.1

---

# 1. AI 开发总规则

本项目由 AI Coding Agent 负责主要代码实现。

AI Agent 必须遵守以下规则。

## 1.1 不允许随意修改技术架构

已经确定：

```text
Frontend
Next.js
TypeScript
Tailwind CSS

Backend
Java 21
Spring Boot 3

Database
MySQL 8

Cache
Redis

Search
OpenSearch

Authentication
JWT + API Key

Payment
Stripe

Deployment
Docker
Kubernetes
```

除非用户明确要求，否则不得替换核心技术。

---

# 2. 开发原则

AI Agent 必须遵守：

```text
1. 先设计，后编码
2. 先数据库，后业务
3. 先 Domain，再 API
4. 所有 API 必须有统一 Response
5. 所有 API 必须有统一 Error
6. 所有核心数据必须有 Source
7. 所有金融代码必须支持状态
8. 所有敏感数据不得写入普通日志
9. 所有 API 必须支持 Request ID
10. 所有数据库修改必须使用 Migration
11. 不允许直接修改生产数据库
12. 不允许删除已有 API
13. API 必须保持向后兼容
```

---

# 3. 项目目标

建立一个全球金融信息数据平台。

核心数据：

```text
IBAN
SWIFT
BIC
Routing Number
Sort Code
BSB
IFSC
CNAPS
Bank Code
Clearing Code
Bank
Bank Branch
Country
Currency
```

核心产品：

```text
1. Consumer Website
2. Bank Directory
3. Financial Data API
4. Developer Portal
5. Admin System
6. Data Pipeline
7. Billing System
```

---

# 4. 产品架构

```text
                         Internet
                            │
                     Cloudflare / CDN
                            │
              ┌─────────────┴─────────────┐
              │                           │
             Web                         API
              │                           │
          Next.js                    Spring Boot
              │                           │
              └─────────────┬─────────────┘
                            │
                     Domain Services
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       MySQL              Redis          OpenSearch
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                       Data Pipeline
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
      Official          Licensed          Public
        Data              Data             Data
```

---

# 5. Monorepo

推荐：

```text
global-financial-data/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── admin/
│
├── services/
│   ├── institution/
│   ├── identifier/
│   ├── iban/
│   ├── swift/
│   ├── routing/
│   ├── search/
│   ├── billing/
│   └── usage/
│
├── data-pipeline/
│   ├── iban/
│   ├── swift/
│   ├── routing/
│   ├── sort-code/
│   ├── bsb/
│   ├── ifsc/
│   └── cnaps/
│
├── sdk/
│   ├── javascript/
│   ├── python/
│   ├── java/
│   └── go/
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── k8s/
│   └── terraform/
│
├── docs/
│
└── README.md
```

如果使用 Java 多模块：

```text
backend/
├── financial-common
├── financial-domain
├── financial-data
├── financial-api
├── financial-auth
├── financial-billing
├── financial-search
└── financial-admin
```

---

# 6. Backend 技术规范

使用：

```text
Java 21
Spring Boot 3.x
Spring Web
Spring Validation
Spring Security
Spring Data JPA
MyBatis 可选
Flyway
Redis
OpenSearch Client
Micrometer
OpenAPI
JUnit 5
Testcontainers
```

推荐：

```text
Controller
    ↓
Application Service
    ↓
Domain Service
    ↓
Repository
    ↓
Database
```

禁止：

```text
Controller
    ↓
直接操作 Repository
```

---

# 7. API 分层

```text
api
│
├── controller
├── dto
├── mapper
├── exception
└── config

application
│
├── service
├── command
└── query

domain
│
├── model
├── service
├── repository
└── enum

infrastructure
│
├── persistence
├── redis
├── opensearch
└── provider
```

---

# 8. Frontend 技术规范

使用：

```text
Next.js
TypeScript
App Router
Tailwind CSS
shadcn/ui
next-intl
React Hook Form
Zod
TanStack Query
```

要求：

```text
SSR
SSG
ISR
SEO
Responsive
Accessibility
Dark Mode
Internationalization
```

---

# 9. Website 页面

必须实现：

```text
/
 /iban-checker
 /swift-codes
 /routing-numbers
 /sort-codes
 /bsb
 /ifsc
 /cnaps
 /banks
 /countries
 /pricing
 /developers
 /docs
 /about
 /contact
 /status
```

---

# 10. 首页

首页必须包含：

```text
Hero
Search
Popular Tools
Supported Identifiers
Bank Directory
API Introduction
Developer CTA
Pricing
FAQ
Footer
```

Hero：

```text
Global Financial Data API

Bank identifiers, account formats and financial institution data
through one simple API.
```

搜索框：

```text
Search bank, SWIFT, IBAN, routing number...
```

搜索必须支持：

```text
Bank Name
SWIFT
BIC
IBAN
Routing
Sort Code
BSB
IFSC
CNAPS
```

---

# 11. Universal Search

前端：

```text
GET /api/search?q=ICBKCNBJ
```

后端自动识别：

```text
IBAN
SWIFT
BIC
ROUTING
SORT_CODE
BSB
IFSC
CNAPS
BANK
BRANCH
```

返回：

```json
{
  "query": "ICBKCNBJ",
  "detected_type": "SWIFT",
  "results": []
}
```

---

# 12. Domain Entity

核心 Entity：

```text
FinancialInstitution
BankBranch
BankIdentifier
Country
Currency
IBANCountryFormat
DataSource
DataVersion
```

---

# 13. FinancialInstitution

字段：

```text
id
legalName
nameEn
nameLocal
shortName
countryId
institutionType
website
status
createdAt
updatedAt
```

---

# 14. BankBranch

字段：

```text
id
institutionId
branchName
branchNameEn
address
city
state
province
postalCode
latitude
longitude
phone
status
createdAt
updatedAt
```

---

# 15. BankIdentifier

字段：

```text
id
institutionId
branchId
identifierType
identifierValue
countryCode
status
sourceId
validFrom
validTo
verifiedAt
createdAt
updatedAt
```

Identifier Type：

```text
SWIFT
BIC
ABA_ROUTING
SORT_CODE
BSB
IFSC
CNAPS
BANK_CODE
CLEARING_CODE
TRANSIT_NUMBER
INSTITUTION_CODE
```

---

# 16. Country

字段：

```text
id
iso2
iso3
numericCode
nameEn
nameLocal
currencyCode
ibanSupported
swiftSupported
localIdentifierType
status
```

---

# 17. IBANCountryFormat

字段：

```text
id
countryCode
ibanLength
bbanLength
structure
example
bankIdentifierPosition
branchIdentifierPosition
accountNumberPosition
version
effectiveDate
sourceId
```

---

# 18. DataSource

所有数据必须记录来源。

字段：

```text
id
name
sourceType
provider
sourceUrl
license
commercialUse
redistributionAllowed
storageAllowed
retrievedAt
status
```

Source Type：

```text
OFFICIAL
LICENSED
BANK
PUBLIC
COMMUNITY
MANUAL
```

---

# 19. DataVersion

```text
id
dataset
version
sourceId
recordCount
checksum
createdAt
publishedAt
status
```

状态：

```text
DRAFT
VALIDATING
READY
PUBLISHED
ROLLED_BACK
```

---

# 20. Data Change

记录：

```text
id
dataset
entityType
entityId
changeType
beforeData
afterData
sourceId
createdAt
```

Change Type：

```text
NEW
UPDATED
REMOVED
REACTIVATED
```

---

# 21. 数据库

使用：

```text
MySQL 8
UTF8MB4
UTC
BIGINT
DECIMAL
JSON
```

所有时间：

```text
UTC
```

API 输出：

```text
ISO-8601
```

例如：

```text
2026-09-08T08:00:00Z
```

---

# 22. Identifier 唯一约束

必须：

```sql
UNIQUE(identifier_type, identifier_value)
```

例如：

```text
SWIFT + ICBKCNBJ
CNAPS + 102xxxxxxxxx
IFSC + SBIN0001234
BSB + 062001
```

不能只对：

```text
identifier_value
```

做全局唯一。

---

# 23. API Base URL

Production：

```text
https://api.example.com/v1
```

Development：

```text
http://localhost:8080/v1
```

---

# 24. API Authentication

使用：

```http
Authorization: Bearer sk_live_xxxxx
```

API Key：

```text
sk_test_xxx
sk_live_xxx
```

数据库只保存：

```text
key_hash
```

不能保存明文 API Key。

---

# 25. API Response

统一：

```json
{
  "data": {},
  "meta": {
    "request_id": "req_xxx"
  }
}
```

错误：

```json
{
  "error": {
    "code": "INVALID_IBAN",
    "message": "The IBAN format is invalid",
    "request_id": "req_xxx"
  }
}
```

---

# 26. API Endpoint

## IBAN

```http
GET /v1/iban/validate?iban={iban}
```

---

## SWIFT

```http
GET /v1/swift/{code}
```

---

## Routing

```http
GET /v1/routing/{number}
```

---

## Sort Code

```http
GET /v1/sort-code/{code}
```

---

## BSB

```http
GET /v1/bsb/{code}
```

---

## IFSC

```http
GET /v1/ifsc/{code}
```

---

## CNAPS

```http
GET /v1/cnaps/{code}
```

---

# 27. Bank API

```http
GET /v1/banks
GET /v1/banks/{id}
GET /v1/banks/search?q=
GET /v1/banks/{id}/branches
```

---

# 28. Country API

```http
GET /v1/countries
GET /v1/countries/{code}
GET /v1/countries/{code}/iban-format
```

---

# 29. Universal Lookup API

```http
GET /v1/lookup?q={value}
```

流程：

```text
Input
 ↓
Normalize
 ↓
Detect Identifier
 ↓
Search Redis
 ↓
Search MySQL
 ↓
Search OpenSearch
 ↓
Resolve Entity
 ↓
Return
```

---

# 30. IBAN Validation

必须支持：

```text
Normalize
Country
Length
Character
Checksum
Structure
BBAN
Bank Code Extraction
```

流程：

```text
Input
 ↓
Remove Spaces
 ↓
Uppercase
 ↓
Country Check
 ↓
Length Check
 ↓
MOD97
 ↓
Country Structure
 ↓
Parse
```

注意：

```text
Format Valid != Account Exists
```

不能声称验证了真实银行账户存在。

---

# 31. SWIFT/BIC Validation

验证：

```text
8 or 11 characters
Bank Code
Country Code
Location Code
Branch Code
```

格式：

```text
BBBB CC LL bbb
```

其中：

```text
BBBB = Institution
CC = Country
LL = Location
bbb = Branch
```

---

# 32. Routing Validation

检查：

```text
9 digits
Checksum
Format
Status
Institution
```

如果没有授权数据，不得自行声称数据为官方完整数据库。

---

# 33. Data Provider Interface

所有外部数据源必须实现统一接口：

```java
public interface FinancialDataProvider {

    ProviderMetadata metadata();

    RawDataset fetch();

    List<FinancialRecord> parse(RawDataset dataset);

    ValidationResult validate(List<FinancialRecord> records);
}
```

---

# 34. Provider Pipeline

```text
Fetch
 ↓
Raw Storage
 ↓
Parse
 ↓
Normalize
 ↓
Validate
 ↓
Deduplicate
 ↓
Entity Match
 ↓
Diff
 ↓
QA
 ↓
Publish
```

---

# 35. Raw Data

原始数据不得直接覆盖。

保存：

```text
raw/
  iban/
  swift/
  routing/
  cnaps/
```

文件：

```text
dataset
version
checksum
source
downloadTime
```

---

# 36. Normalize

不同数据源必须转换成统一模型。

例如：

```text
Bank Name
银行名称
Institution Name
Financial Institution
```

最终统一：

```text
institution.name
```

---

# 37. Entity Matching

必须解决：

```text
ICBC
Industrial and Commercial Bank of China
中国工商银行
中国工商银行股份有限公司
```

映射：

```text
institution_id = inst_xxx
```

不能创建四个银行。

---

# 38. Data Deduplication

匹配优先级：

```text
Identifier
 ↓
Official Institution ID
 ↓
SWIFT
 ↓
Bank Name + Country
 ↓
Bank Name + Address
```

---

# 39. Data Quality

每条数据必须有：

```text
source
sourceType
retrievedAt
verifiedAt
status
```

内部质量等级：

```text
OFFICIAL
LICENSED
VERIFIED
UNVERIFIED
```

---

# 40. Redis

缓存：

```text
identifier:{type}:{value}
bank:{id}
country:{code}
iban-format:{country}
```

TTL：

```text
Identifier:
24h

Bank:
24h

Country:
7d
```

对于稳定数据也可以采用主动失效，而不是只依赖 TTL。

---

# 41. OpenSearch

索引：

```text
financial_institutions
bank_branches
identifiers
```

支持：

```text
Exact
Prefix
Fuzzy
Chinese
English
```

例如：

```text
ICBC
工商
Industrial Commercial
ICBKCNBJ
```

都可以找到：

```text
Industrial and Commercial Bank of China
```

---

# 42. API Rate Limit

使用 Redis。

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
Custom
```

超过：

```http
429 Too Many Requests
```

---

# 43. API Quota

每月：

```text
Free
500

Developer
20,000

Startup
100,000

Business
500,000

Enterprise
Custom
```

---

# 44. Usage

记录：

```text
apiKeyId
organizationId
endpoint
method
identifierType
country
statusCode
responseTime
requestDate
```

不保存完整金融账户数据。

---

# 45. API Billing

使用 Stripe。

核心：

```text
User
Organization
Plan
Subscription
Invoice
Usage
```

支持：

```text
Monthly
Annual
Upgrade
Downgrade
Cancel
```

---

# 46. Pricing 页面

套餐：

```text
Free
Developer
Startup
Business
Enterprise
```

必须展示：

```text
Requests
Rate Limit
API Access
Bank Directory
Branch Data
Support
SLA
```

---

# 47. Developer Portal

页面：

```text
/developers
/docs
/docs/quickstart
/docs/authentication
/docs/iban
/docs/swift
/docs/routing
/docs/banks
/docs/errors
/docs/rate-limits
/docs/sdks
/docs/changelog
```

---

# 48. API Documentation

必须生成：

```text
OpenAPI 3.1
```

文件：

```text
openapi.yaml
```

要求：

```text
Every endpoint
Every parameter
Every response
Every error
Every authentication method
```

都必须定义。

---

# 49. SDK

第一阶段：

```text
JavaScript
Python
PHP
Java
Go
```

SDK 必须：

```text
Authentication
Retry
Timeout
Error Handling
Request ID
```

---

# 50. Retry

只允许对：

```text
429
502
503
504
```

进行自动 Retry。

指数退避：

```text
1s
2s
4s
8s
```

最多：

```text
3 attempts
```

400 类错误不得 Retry。

---

# 51. API Timeout

默认：

```text
3 seconds
```

Enterprise：

```text
5 seconds
```

内部数据库查询目标：

```text
< 100ms
```

---

# 52. Security

必须：

```text
HTTPS
JWT
API Key Hash
RBAC
Rate Limit
WAF
CORS
CSRF
SQL Injection Protection
XSS Protection
Audit Log
```

---

# 53. 金融数据隐私

禁止普通日志记录：

```text
完整 IBAN
完整银行账户号码
API Secret
Authorization Header
Payment information
```

日志必须 Mask。

例如：

```text
DE89****************3000
```

---

# 54. Admin

后台：

```text
/admin
```

模块：

```text
Dashboard

Institutions
Branches
Identifiers
Countries
IBAN Formats

Data Sources
Data Imports
Data Versions
Data Changes

API Users
API Keys
API Usage

Plans
Subscriptions
Payments

System
Jobs
Logs
Audit
```

---

# 55. Admin RBAC

角色：

```text
SUPER_ADMIN
DATA_ADMIN
SUPPORT
BILLING_ADMIN
VIEWER
```

权限：

```text
institution.read
institution.write

branch.read
branch.write

identifier.read
identifier.write

data.publish
data.rollback

billing.read
billing.write
```

---

# 56. Audit Log

管理员所有写操作记录：

```text
userId
organizationId
action
resource
resourceId
before
after
ip
userAgent
createdAt
```

---

# 57. SEO

必须使用：

```text
SSR
SSG
ISR
```

核心页面：

```text
/banks/{slug}
/swift-codes/{code}
/routing-numbers/{number}
/ifsc/{code}
/bsb/{code}
/sort-codes/{code}
/cnaps/{code}
/iban/{country}
```

---

# 58. SEO 页面模板

每个页面必须有：

```text
Title
Meta Description
H1
Breadcrumb
Summary
Bank Information
Identifier Information
Related Codes
Related Banks
FAQ
Last Updated
```

---

# 59. SEO 防止低质量页面

AI Agent 不得无限生成没有实际数据的页面。

只有满足：

```text
Valid Data
+
Meaningful Content
+
Unique Entity
```

才允许发布。

如果数据不存在：

```text
404
```

而不是生成空页面。

---

# 60. Sitemap

拆分：

```text
sitemap-index.xml

sitemap-banks.xml
sitemap-swift.xml
sitemap-routing.xml
sitemap-ifsc.xml
sitemap-bsb.xml
sitemap-cnaps.xml
sitemap-countries.xml
```

---

# 61. Internal Linking

Bank 页面：

```text
Bank
 ↓
Country
 ↓
SWIFT
 ↓
Routing
 ↓
Branches
```

Identifier 页面：

```text
Identifier
 ↓
Bank
 ↓
Country
 ↓
Other Identifiers
```

---

# 62. 多语言

第一阶段：

```text
English
Chinese
```

后续：

```text
Spanish
Portuguese
French
German
Japanese
Korean
```

URL：

```text
/en/
/zh/
/es/
/fr/
```

---

# 63. Homepage SEO

Title：

```text
Global Financial Data API | IBAN, SWIFT, Routing & Bank Lookup
```

Description：

```text
Validate IBANs, find SWIFT/BIC codes, routing numbers, bank branches and financial institution data through a reliable global financial data API.
```

---

# 64. Observability

使用：

```text
OpenTelemetry
Prometheus
Grafana
Sentry
Loki
```

必须监控：

```text
API latency
API errors
Database
Redis
OpenSearch
Data Pipeline
Data Freshness
Queue
Billing
```

---

# 65. Health API

```http
GET /health
GET /health/ready
GET /health/live
```

---

# 66. Status Page

```text
/status
```

展示：

```text
API
Website
Search
IBAN
SWIFT
Routing
Bank Directory
```

---

# 67. Docker

每个服务必须支持：

```text
docker build
docker run
```

Production 不允许：

```text
latest
```

必须使用：

```text
image:tag
```

例如：

```text
api:1.0.0
web:1.0.0
admin:1.0.0
```

---

# 68. Environment

必须区分：

```text
local
development
staging
production
```

配置：

```text
DATABASE_URL
REDIS_URL
OPENSEARCH_URL

JWT_SECRET

STRIPE_SECRET_KEY

API_ENCRYPTION_KEY
```

Secret 不允许进入 Git。

---

# 69. CI/CD

GitHub Actions：

```text
Pull Request
 ↓
Lint
 ↓
Unit Test
 ↓
Integration Test
 ↓
Build
 ↓
Docker Build
 ↓
Security Scan
 ↓
Deploy Staging
 ↓
E2E
 ↓
Production
```

---

# 70. Database Migration

使用：

```text
Flyway
```

文件：

```text
V1__init.sql
V2__create_institution.sql
V3__create_branch.sql
V4__create_identifier.sql
```

禁止直接修改历史 Migration。

---

# 71. Testing

必须包含：

```text
Unit Test
Integration Test
Repository Test
API Test
Security Test
E2E Test
```

核心测试：

```text
IBAN Validator
SWIFT Validator
Routing Validator
Identifier Resolver
Bank Search
API Authentication
Rate Limit
Quota
Billing
```

---

# 72. Testcontainers

Integration Test 使用：

```text
MySQL
Redis
OpenSearch
```

通过 Testcontainers 启动。

不允许依赖开发者本机安装数据库才能运行测试。

---

# 73. Definition of Done

一个开发任务只有同时满足以下条件才算完成：

```text
[ ] Code completed
[ ] Unit test
[ ] Integration test
[ ] API documented
[ ] Database migration
[ ] Error handling
[ ] Logging
[ ] Security check
[ ] Performance check
[ ] README updated
```

---

# 74. AI Coding Agent 开发规则

AI Agent 每次执行任务必须：

### Step 1

阅读：

```text
README.md
AI-DEVELOPMENT.md
ARCHITECTURE.md
DATABASE.md
API.md
```

### Step 2

确认现有代码。

### Step 3

不要重复创建已有模块。

### Step 4

先列出修改文件。

### Step 5

执行代码。

### Step 6

运行测试。

### Step 7

修复失败。

### Step 8

输出：

```text
Changed
Added
Tests
Potential Issues
Next Task
```

---

# 75. AI 禁止事项

禁止：

```text
1. 随意更换数据库
2. 随意更换 Spring Boot
3. 删除 API
4. 删除数据库字段
5. 修改已有 API Response
6. 把 Secret 写入代码
7. 把 API Key 写入日志
8. 把 IBAN 明文写入日志
9. 未授权抓取商业数据
10. 伪造银行数据
11. 生成不存在的银行
12. 为 SEO 制造空页面
13. 跳过测试
14. 修改历史 Migration
15. 为解决小问题重构整个项目
```

---

# 76. Task ID

所有 AI 开发任务必须有：

```text
FIN-001
FIN-002
FIN-003
...
```

---

# 77. Sprint 1

## FIN-001 Project Initialization

目标：

```text
创建 Monorepo
初始化 Next.js
初始化 Spring Boot
初始化 Admin
配置 Docker
配置 Git
```

验收：

```text
npm run build
mvn test
docker build
```

---

# 78. FIN-002 Database

创建：

```text
country
currency
financial_institution
bank_branch
bank_identifier
iban_country_format
data_source
data_version
data_change
```

---

# 79. FIN-003 Authentication

实现：

```text
Register
Login
Logout
JWT
Refresh Token
Password Reset
```

---

# 80. FIN-004 Organization

实现：

```text
Organization
Member
Role
Permission
```

---

# 81. Sprint 2

## FIN-005 Institution Service

实现：

```text
Create
Update
Get
Search
Status
```

---

## FIN-006 Branch Service

实现：

```text
Create
Update
Get
Search
```

---

## FIN-007 Identifier Service

实现：

```text
Create
Update
Get
Search
Resolve
```

---

# 82. Sprint 3

## FIN-008 IBAN Validator

必须完成：

```text
Country
Length
Checksum
Structure
BBAN
```

---

## FIN-009 SWIFT Resolver

实现：

```text
Validate
Lookup
Bank Resolve
Country Resolve
Branch Resolve
```

---

## FIN-010 Routing Resolver

实现：

```text
Validate
Lookup
Bank Resolve
```

---

# 83. Sprint 4

## FIN-011 Universal Lookup

实现：

```text
Auto Detect
Resolve
Search
Rank
```

---

## FIN-012 Redis

实现：

```text
Cache
TTL
Invalidation
Rate Limit
```

---

## FIN-013 OpenSearch

实现：

```text
Index
Search
Autocomplete
Reindex
```

---

# 84. Sprint 5

## FIN-014 API Key

实现：

```text
Create
List
Revoke
Rotate
Hash
```

---

## FIN-015 API Usage

实现：

```text
Request Count
Quota
Endpoint Usage
Error Rate
Latency
```

---

## FIN-016 Rate Limit

实现：

```text
Redis Token Bucket
Plan Limit
429 Response
```

---

# 85. Sprint 6

## FIN-017 Developer Portal

页面：

```text
Quickstart
Authentication
API Reference
Errors
Rate Limits
SDK
```

---

## FIN-018 Pricing

实现：

```text
Plans
Pricing
Checkout
Subscription
```

---

## FIN-019 Stripe

实现：

```text
Checkout
Subscription
Webhook
Invoice
Cancel
Upgrade
```

---

# 86. Sprint 7

## FIN-020 Data Pipeline

实现：

```text
Provider
Fetch
Parse
Normalize
Validate
Diff
Publish
```

---

## FIN-021 IBAN Data

导入：

```text
Country
IBAN Format
Bank Identifier
```

---

## FIN-022 SWIFT Data

实现：

```text
Import
Normalize
Entity Matching
```

数据来源必须经过授权或符合适用许可。

---

# 87. Sprint 8

## FIN-023 China CNAPS

实现：

```text
CNAPS
Bank Code
Branch
Bank
Province
City
```

---

## FIN-024 IFSC

实现：

```text
IFSC
Bank
Branch
State
City
```

---

## FIN-025 BSB

实现：

```text
BSB
Bank
Branch
State
```

---

# 88. Sprint 9

## FIN-026 Website

实现：

```text
Homepage
IBAN Checker
SWIFT Lookup
Routing Lookup
Bank Directory
Country Directory
Pricing
```

---

## FIN-027 SEO

实现：

```text
Metadata
Sitemap
Schema
Canonical
Breadcrumb
ISR
```

---

# 89. Sprint 10

## FIN-028 Admin

实现：

```text
Dashboard
Institution
Branch
Identifier
Data Source
Data Version
```

---

## FIN-029 Data QA

实现：

```text
Diff
Review
Approve
Reject
Rollback
```

---

# 90. Sprint 11

## FIN-030 Monitoring

实现：

```text
Metrics
Tracing
Logs
Error Tracking
Health Check
```

---

## FIN-031 Status Page

实现：

```text
Service Status
Incident
Maintenance
```

---

# 91. Sprint 12

## FIN-032 Production

完成：

```text
Docker
Kubernetes
CI/CD
Cloudflare
SSL
Backup
Monitoring
Alert
```

---

# 92. MVP 最终验收

用户可以：

```text
1. 打开官网
2. 查询 IBAN
3. 查询 SWIFT
4. 查询 Routing
5. 搜索 Bank
6. 搜索 Branch
7. 注册
8. 创建 API Key
9. 调 API
10. 查看 API Usage
11. 购买套餐
12. 管理订阅
```

管理员可以：

```text
1. 管理银行
2. 管理网点
3. 管理 Identifier
4. 管理数据源
5. 导入数据
6. 查看数据变化
7. 审核数据
8. 发布数据
9. 回滚数据
10. 查看 API 使用量
11. 管理用户
12. 管理订阅
```

---

# 93. V1 API 最终列表

```text
GET /v1/iban/validate

GET /v1/swift/{code}

GET /v1/routing/{number}

GET /v1/sort-code/{code}

GET /v1/bsb/{code}

GET /v1/ifsc/{code}

GET /v1/cnaps/{code}

GET /v1/lookup

GET /v1/banks

GET /v1/banks/{id}

GET /v1/banks/search

GET /v1/banks/{id}/branches

GET /v1/countries

GET /v1/countries/{code}

GET /v1/countries/{code}/iban-format
```

---

# 94. V1 数据覆盖

第一阶段：

```text
IBAN
SWIFT/BIC
US Routing
UK Sort Code
Australia BSB
India IFSC
China CNAPS
```

第二阶段：

```text
Canada Transit
Hong Kong Clearing
Singapore Bank Code
Japan Zengin
Germany BLZ
Brazil
Mexico CLABE
```

---

# 95. V2

增加：

```text
LEI
CHIPS UID
Fedwire
SEPA
ACH
TARGET
CHAPS
ISO 20022
```

---

# 96. AI 开发输出格式

AI Agent 每完成一个 Task，必须输出：

```text
## Task
FIN-XXX

## Status
DONE / PARTIAL / BLOCKED

## Changed Files
- xxx
- xxx

## Database Changes
- xxx

## API Changes
- xxx

## Tests
- xxx

## Verification
- xxx

## Known Issues
- xxx

## Next Recommended Task
FIN-XXX
```

---

# 97. AI Commit 规范

Git Commit：

```text
feat: add iban validation api
feat: add swift lookup
feat: add bank search
fix: resolve routing lookup
refactor: improve identifier resolver
test: add iban validator tests
docs: update api documentation
chore: upgrade dependencies
```

---

# 98. Release

版本：

```text
MAJOR.MINOR.PATCH
```

例如：

```text
1.0.0
1.1.0
1.1.1
2.0.0
```

API：

```text
/v1
/v2
```

不得因为普通 Bug 修复直接升级 API Major Version。

---

# 99. 最终 AI 开发原则

整个项目必须围绕：

```text
DATA FIRST
API FIRST
SEO SECOND
UI THIRD
```

核心资产：

```text
Financial Institution Entity
        ↓
Identifier
        ↓
Branch
        ↓
Country
        ↓
Data Source
        ↓
Data Version
```

最终：

```text
                    Global Financial Data
                             │
             ┌───────────────┼───────────────┐
             │               │               │
           Website           API           Database
             │               │               │
          SEO Traffic     Developers     Data Asset
             │               │               │
             └───────────────┼───────────────┘
                             │
                         Revenue
                             │
                  Subscription / API
                             │
                         Enterprise
```

**AI Coding Agent 的最高优先级不是快速写代码，而是保证数据模型、API Contract、数据来源、数据质量和系统架构长期稳定。**