# FinCode — Global Financial Data API

[![CI](https://github.com/WilliamWangL/fin-code/actions/workflows/ci.yml/badge.svg)](https://github.com/WilliamWangL/fin-code/actions/workflows/ci.yml)
[![Java 21](https://img.shields.io/badge/Java-21-orange)](apps/api/pom.xml)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](apps/web/package.json)
[![License](https://img.shields.io/badge/license-source--available-lightgrey)](LICENSE)

Look up and validate bank identifiers from a single REST API: **IBAN**, **SWIFT/BIC**,
**IFSC**, **CNAPS**, **UK/IE sort codes**, **Australian BSB**, **US ABA routing numbers**
and **card BINs**. Every response is the same JSON envelope, and identifier lookups work
without an API key.

**[Website](https://fincode.ecommica.com/en)** · **[Quickstart](https://fincode.ecommica.com/en/docs/quickstart)** · **[API reference](https://fincode.ecommica.com/en/docs/api-reference)** · **[SDKs](https://fincode.ecommica.com/en/docs/sdks)** · **[Pricing](https://fincode.ecommica.com/en/pricing)**

## Endpoints

| Identifier | Endpoint | Anonymous |
| --- | --- | --- |
| IBAN validation | `GET /v1/iban/validate?iban={iban}` | yes |
| IBAN validation + bank | `GET /v1/iban/{iban}` | yes |
| SWIFT / BIC | `GET /v1/swift/{code}` | yes |
| Indian IFSC | `GET /v1/ifsc/{code}` | yes |
| China CNAPS | `GET /v1/cnaps/{code}` | yes |
| UK / Ireland sort code | `GET /v1/sort-code/{code}` | yes |
| Australian BSB | `GET /v1/bsb/{code}` | yes |
| US ABA routing number | `GET /v1/routing/{number}` | yes |
| Card BIN / IIN | `GET /v1/bin/{bin}` | yes |
| Universal lookup | `GET /v1/lookup?q={value}` | API key |
| Bank directory | `GET /v1/banks`, `/search`, `/{id}`, `/by-slug/{slug}`, `/{id}/branches` | API key |
| Country reference | `GET /v1/countries`, `/{code}`, `/{code}/iban-format` | API key |

Anonymous identifier lookups are rate limited per client IP. Authenticated calls use
your plan limits and are metered per endpoint, per day and per key under `/v1/usage`.

## Quickstart

No key needed for the first request:

```bash
curl -s https://api.ecommica.com/v1/swift/ICBKCNBJ
```

```json
{
  "data": {
    "swift_code": "ICBKCNBJ",
    "bic": "ICBKCNBJ",
    "format": {
      "institution_code": "ICBK",
      "country_code": "CN",
      "location_code": "BJ",
      "branch_code": null
    },
    "bank": {
      "id": "inst_icbc",
      "name_en": "Industrial and Commercial Bank of China",
      "name_local": "中国工商银行股份有限公司",
      "short_name": "ICBC",
      "country": "CN",
      "website": "https://www.icbc.com.cn"
    },
    "city": "Beijing",
    "status": "ACTIVE",
    "source": {
      "name": "SWIFT/BIC directory",
      "source_type": "PUBLIC",
      "retrieved_at": "2026-09-01"
    }
  },
  "meta": { "request_id": "req_9f2c81a4" }
}
```

IBAN validation — format, country, length, MOD-97 checksum and BBAN structure:

```bash
curl -s "https://api.ecommica.com/v1/iban/validate?iban=DE89370400440532013000"
```

```json
{
  "data": {
    "valid": true,
    "iban": "DE89370400440532013000",
    "country": "DE",
    "check_digits": "89",
    "bank_code": "37040044",
    "account_number": "0532013000",
    "length": 22,
    "expected_length": 22,
    "checks": { "charset": true, "country": true, "length": true, "checksum": true, "structure": true }
  },
  "meta": { "request_id": "req_1a2b3c4d" }
}
```

`GET /v1/iban/{iban}` runs the same validation and additionally resolves the bank behind
the BBAN through the SWIFT/BIC directory; a valid IBAN whose bank is unknown still
returns `valid: true` with the `bank` field omitted.

Pass `Authorization: Bearer sk_...` for directory endpoints (`/v1/banks`, `/v1/countries`,
`/v1/lookup`). Create keys from the [dashboard](https://fincode.ecommica.com/en/dashboard).

### Response envelope

```json
{ "data": <payload>, "meta": { "request_id": "req_...", "next_cursor": null } }
```

Errors use the same shape and always carry the request id:

```json
{ "error": { "code": "INVALID_IBAN", "message": "...", "request_id": "req_..." } }
```

Common codes: `INVALID_*` (422), `NOT_FOUND` (404), `UNAUTHORIZED` (401),
`QUOTA_EXCEEDED` (402), `RATE_LIMITED` (429), `INTERNAL` (500).

## Official SDKs

| Language | Install | Repository |
| --- | --- | --- |
| TypeScript / JavaScript | copy [`fincode.ts`](apps/web/public/sdk/fincode.ts) into your project (zero dependencies) | this repo |
| Python | `pip install "git+https://github.com/WilliamWangL/fincode-python.git"` | [fincode-python](https://github.com/WilliamWangL/fincode-python) |
| Java | `mvn install` the clone, then depend on `io.github.williamwangl:fincode-java:1.0.0` | [fincode-java](https://github.com/WilliamWangL/fincode-java) |
| Go | `go get github.com/WilliamWangL/fincode-go` | [fincode-go](https://github.com/WilliamWangL/fincode-go) |
| PHP | add a `vcs` repository pointing at the repo, then `composer require fincode/fincode-php:^1.0` | [fincode-php](https://github.com/WilliamWangL/fincode-php) |

```ts
import { FinCode } from "./fincode";

const fincode = new FinCode({ apiKey: process.env.FINCODE_API_KEY! });
const { data, meta } = await fincode.swift.get("ICBKCNBJ");
```

## Coverage and data sources

| Data set | Coverage | Source |
| --- | --- | --- |
| SWIFT / BIC | Global institution directory | public BIC directory |
| IBAN | Country formats, length and MOD-97 check | IBAN registry + bank registry |
| IFSC | Indian bank branches | Razorpay IFSC release |
| CNAPS | Chinese bank codes and areas | CNAPS bank list |
| Sort codes | UK and Ireland | EISCD-style directory |
| BSB | Australian bank branches | AusPayNet BSB directory |
| ABA routing | US financial institutions | FedACH directory |
| Card BIN / IIN | Issuer, brand, type, country | public BIN ranges |
| Bank directory | Institutions, slugs and branches | merged registry |

The website exposes the same data as free browsable pages — for example
[ICBKCNBJ](https://fincode.ecommica.com/en/swift-codes/ICBKCNBJ),
[IFSC lookup](https://fincode.ecommica.com/en/ifsc), [sort codes](https://fincode.ecommica.com/en/sort-codes)
and the [bank directory](https://fincode.ecommica.com/en/banks).

## Repository layout

<details>
<summary>Monorepo structure, local development and tests</summary>

```
apps/api     Spring Boot 3.5 service (Java 21, MySQL 8, Redis 7, Flyway migrations)
apps/web     Next.js 15 site — marketing pages, docs, dashboard, directory explorer
apps/web/public/sdk/fincode.ts   reference TypeScript client
data/        source CSV/XLSX exports and SQL import scripts per identifier
scripts/     Python importers that normalise the sources into the schema
deploy/      nginx site configs for the website and API hosts
```

Run the infrastructure, the API and the site:

```bash
docker compose up -d mysql redis          # MySQL on 3307, Redis on 6380
cp .env.example .env                      # fill in JWT_SECRET at minimum

cd apps/api && mvn spring-boot:run        # http://localhost:8080
cd apps/web && npm install && npm run dev # http://localhost:3000
```

Tests: `cd apps/api && mvn test` (contract tests, Testcontainers needs a Docker daemon)
and `cd apps/web && npm run lint && npm run build`.

</details>

## License

The API clients published under `WilliamWangL/fincode-*` are MIT licensed.
This repository is **source-available, all rights reserved** — read it, run it and
evaluate it, but do not redistribute it or resell the service built from it.
See [LICENSE](LICENSE).
