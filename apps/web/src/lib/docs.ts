import { siteConfig } from "@/lib/site";

/**
 * Documentation content for /docs.
 *
 * Page chrome (titles, sidebar labels) is localized through messages;
 * body content is English-only in V1 — the standard convention for API
 * reference material. Full translation is tracked as a follow-up.
 */

export interface DocCode {
  label?: string;
  language: string;
  code: string;
}

export interface DocSection {
  id: string;
  title: string;
  body?: string;
  code?: DocCode[];
  table?: { headers: string[]; rows: string[][] };
}

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  group: "getting-started" | "endpoints" | "reference";
  sections: DocSection[];
}

const API = siteConfig.apiBaseUrl;
const SITE = siteConfig.url;

function code(language: string, content: string, label?: string): DocCode {
  const trimmed = content.replace(/^\n+|\n+$/g, "");
  return label ? { language, code: trimmed, label } : { language, code: trimmed };
}

interface EndpointConfig {
  slug: string;
  title: string;
  description: string;
  path: string;
  intro: string;
  params?: [name: string, type: string, description: string][];
  query?: [name: string, type: string, description: string][];
  requestExample: string;
  responseExample: string;
  errors?: [code: string, description: string][];
  notes?: string;
}

/** Shared builder for single-identifier endpoint docs. */
function endpointDoc(config: EndpointConfig): DocPage {
  const sections: DocSection[] = [
    {
      id: "endpoint",
      title: "Endpoint",
      body: config.intro,
      code: [code("http", `GET ${config.path}`)],
    },
  ];

  const params = [
    ...(config.params ?? []).map(([name, type, description]) => [
      name,
      type,
      "path",
      description,
    ]),
    ...(config.query ?? []).map(([name, type, description]) => [
      name,
      type,
      "query",
      description,
    ]),
  ];
  if (params.length > 0) {
    sections.push({
      id: "parameters",
      title: "Parameters",
      table: {
        headers: ["Name", "Type", "In", "Description"],
        rows: params,
      },
    });
  }

  sections.push(
    {
      id: "example",
      title: "Example request",
      code: [code("bash", config.requestExample)],
    },
    {
      id: "response",
      title: "Example response",
      code: [code("json", config.responseExample)],
    },
  );

  if (config.errors && config.errors.length > 0) {
    sections.push({
      id: "errors",
      title: "Errors",
      table: {
        headers: ["Code", "Description"],
        rows: config.errors,
      },
    });
  }

  if (config.notes) {
    sections.push({
      id: "notes",
      title: "Notes",
      body: config.notes,
    });
  }

  return {
    slug: config.slug,
    title: config.title,
    description: config.description,
    group: "endpoints",
    sections,
  };
}

const GENERIC_ERRORS: [string, string][] = [
  ["NOT_FOUND", "The identifier does not exist in the dataset."],
  ["UNAUTHORIZED", "Missing or invalid API key."],
  ["RATE_LIMITED", "Rate limit exceeded — retry after the indicated delay."],
];

const swiftDoc = endpointDoc({
  slug: "swift",
  title: "SWIFT / BIC lookup",
  description:
    "Resolve a SWIFT/BIC code (ISO 9362) to its institution, country, city and branch.",
  path: `${API}/swift/{code}`,
  intro:
    "Returns the institution behind an 8 or 11 character SWIFT/BIC code, including the head-office location and related identifiers.",
  params: [
    ["code", "string", "The SWIFT/BIC code, e.g. ICBKCNBJ. Case-insensitive."],
  ],
  requestExample: `curl -s "${API}/swift/ICBKCNBJ" \\
  -H "Authorization: Bearer sk_xxx"`,
  responseExample: `{
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
}`,
  errors: [
    ["INVALID_SWIFT", "The code is not a valid 8 or 11 character BIC."],
    ...GENERIC_ERRORS,
  ],
});

const routingDoc = endpointDoc({
  slug: "routing",
  title: "US routing number lookup",
  description:
    "Resolve a 9-digit ABA routing number with checksum validation to its institution.",
  path: `${API}/routing/{number}`,
  intro:
    "Returns the US financial institution behind an ABA routing number, together with the checksum validation result.",
  params: [
    ["number", "string", "The 9-digit ABA routing number, e.g. 021000021."],
  ],
  requestExample: `curl -s "${API}/routing/021000021" \\
  -H "Authorization: Bearer sk_xxx"`,
  responseExample: `{
  "data": {
    "routing_number": "021000021",
    "checksum_valid": true,
    "bank": {
      "id": "inst_jpmorgan",
      "name_en": "JPMorgan Chase Bank, N.A.",
      "short_name": "JPMorgan Chase",
      "country": "US",
      "website": "https://www.jpmorganchase.com"
    },
    "city": "New York",
    "state": "NY",
    "status": "ACTIVE",
    "source": {
      "name": "ABA routing number registry",
      "source_type": "OFFICIAL",
      "retrieved_at": "2026-09-01"
    }
  },
  "meta": { "request_id": "req_7b1e64d0" }
}`,
  errors: [
    ["INVALID_ROUTING", "The number is not 9 digits or fails the checksum."],
    ...GENERIC_ERRORS,
  ],
});

const sortCodeDoc = endpointDoc({
  slug: "sort-code",
  title: "UK sort code lookup",
  description: "Resolve a 6-digit UK sort code to its institution.",
  path: `${API}/sort-code/{code}`,
  intro:
    "Returns the UK institution behind a 6-digit sort code. Dashes in the request value are accepted and normalized.",
  params: [["code", "string", 'The sort code, e.g. "200000" or "20-00-00".']],
  requestExample: `curl -s "${API}/sort-code/20-00-00" \\
  -H "Authorization: Bearer sk_xxx"`,
  responseExample: `{
  "data": {
    "sort_code": "200000",
    "formatted": "20-00-00",
    "bank": {
      "id": "inst_barclays",
      "name_en": "Barclays Bank UK PLC",
      "short_name": "Barclays",
      "country": "GB",
      "website": "https://www.barclays.co.uk"
    },
    "city": "London",
    "status": "ACTIVE",
    "source": {
      "name": "UKPayments sort code directory",
      "source_type": "PUBLIC",
      "retrieved_at": "2026-09-01"
    }
  },
  "meta": { "request_id": "req_3a9f12bb" }
}`,
  errors: [
    ["INVALID_SORT_CODE", "The code is not 6 digits."],
    ...GENERIC_ERRORS,
  ],
});

const bsbDoc = endpointDoc({
  slug: "bsb",
  title: "Australian BSB lookup",
  description: "Resolve a 6-digit Australian BSB (Bank State Branch) number.",
  path: `${API}/bsb/{code}`,
  intro:
    "Returns the Australian institution behind a BSB number. Dashes in the request value are accepted and normalized.",
  params: [["code", "string", 'The BSB, e.g. "062001" or "062-001".']],
  requestExample: `curl -s "${API}/bsb/062-001" \\
  -H "Authorization: Bearer sk_xxx"`,
  responseExample: `{
  "data": {
    "bsb": "062001",
    "formatted": "062-001",
    "bank": {
      "id": "inst_commbank",
      "name_en": "Commonwealth Bank of Australia",
      "short_name": "CommBank",
      "country": "AU",
      "website": "https://www.commbank.com.au"
    },
    "branch": "48 Martin Place Sydney",
    "city": "Sydney",
    "state": "NSW",
    "status": "ACTIVE",
    "source": {
      "name": "AFIA BSB directory",
      "source_type": "PUBLIC",
      "retrieved_at": "2026-09-01"
    }
  },
  "meta": { "request_id": "req_c41d7e82" }
}`,
  errors: [["INVALID_BSB", "The code is not 6 digits."], ...GENERIC_ERRORS],
});

const ifscDoc = endpointDoc({
  slug: "ifsc",
  title: "Indian IFSC lookup",
  description: "Resolve an 11-character Indian Financial System Code.",
  path: `${API}/ifsc/{code}`,
  intro:
    "Returns the Indian bank and branch behind an IFSC assigned by the Reserve Bank of India.",
  params: [["code", "string", "The 11-character IFSC, e.g. SBIN0001234."]],
  requestExample: `curl -s "${API}/ifsc/SBIN0001234" \\
  -H "Authorization: Bearer sk_xxx"`,
  responseExample: `{
  "data": {
    "ifsc": "SBIN0001234",
    "bank": {
      "id": "inst_sbi",
      "name_en": "State Bank of India",
      "short_name": "SBI",
      "country": "IN",
      "website": "https://www.sbi.co.in"
    },
    "branch": "Kurla West, Mumbai",
    "city": "Mumbai",
    "micr": "400240003",
    "status": "ACTIVE",
    "source": {
      "name": "RBI IFSC master directory",
      "source_type": "OFFICIAL",
      "retrieved_at": "2026-09-01"
    }
  },
  "meta": { "request_id": "req_e0b2c5f1" }
}`,
  errors: [["INVALID_IFSC", "The code is not a valid 11-character IFSC."], ...GENERIC_ERRORS],
});

const cnapsDoc = endpointDoc({
  slug: "cnaps",
  title: "China CNAPS code lookup",
  description: "Resolve a 12-digit CNAPS bank identification number.",
  path: `${API}/cnaps/{code}`,
  intro:
    "Returns the Chinese institution behind a 12-digit CNAPS code (联行号) used in the national payment system.",
  params: [["code", "string", "The 12-digit CNAPS code, e.g. 102100099996."]],
  requestExample: `curl -s "${API}/cnaps/102100099996" \\
  -H "Authorization: Bearer sk_xxx"`,
  responseExample: `{
  "data": {
    "cnaps": "102100099996",
    "bank_code": "102",
    "bank": {
      "id": "inst_icbc",
      "name_en": "Industrial and Commercial Bank of China",
      "name_local": "中国工商银行股份有限公司",
      "short_name": "ICBC",
      "country": "CN",
      "website": "https://www.icbc.com.cn"
    },
    "branch": "Head Office (北京)",
    "city": "Beijing",
    "status": "ACTIVE",
    "source": {
      "name": "PBOC CNAPS participant list",
      "source_type": "OFFICIAL",
      "retrieved_at": "2026-09-01"
    }
  },
  "meta": { "request_id": "req_8d3a06e9" }
}`,
  errors: [["INVALID_CNAPS", "The code is not 12 digits."], ...GENERIC_ERRORS],
});

const binDoc = endpointDoc({
  slug: "bin",
  title: "Card BIN / IIN lookup",
  description:
    "Resolve a card BIN (the first 6 to 8 digits of a card number) to its brand, type and issuing bank.",
  path: `${API}/bin/{bin}`,
  intro:
    "Returns the card network, funding type, issuing bank and region membership flags for a BIN. Records are served from the FinCode BIN directory; unknown BINs are resolved through the upstream provider and persisted so later lookups hit the directory directly.",
  params: [["bin", "string", "The card BIN/IIN — 6 to 8 digits, e.g. 405316."]],
  requestExample: `curl -s "${API}/bin/405316" \\
  -H "Authorization: Bearer sk_xxx"`,
  responseExample: `{
  "data": {
    "bin": "405316",
    "country_iso2": "US",
    "is_eu": false,
    "is_eea": false,
    "is_sepa": false,
    "country": "United States",
    "brand": "Visa",
    "type": "credit",
    "categories": ["basic"],
    "issuer": "Jpmorgan Chase Bank N.A.",
    "is_valid": true
  },
  "meta": { "request_id": "req_3c9f21b7" }
}`,
  errors: [
    ["INVALID_BIN", "The BIN is not 6 to 8 digits."],
    ...GENERIC_ERRORS,
  ],
  notes:
    "This endpoint is also available anonymously for the website BIN checker and is rate-limited per network address. Pass an API key for higher limits and quota accounting.",
});

export const docPages: DocPage[] = [
  // ── Getting started ─────────────────────────────────────────────────────
  {
    slug: "quickstart",
    title: "Quickstart",
    description:
      "Create an API key and validate your first IBAN in under five minutes.",
    group: "getting-started",
    sections: [
      {
        id: "create-key",
        title: "1. Create an API key",
        body: "Sign up and generate an API key from the dashboard. Keys use the sk_ prefix. Keys are shown once — store them somewhere safe and rotate them from the dashboard at any time.",
      },
      {
        id: "first-request",
        title: "2. Make your first request",
        body: "All requests authenticate with the Authorization header. The example below validates an IBAN and returns the parsed bank code.",
        code: [
          code(
            "bash",
            `curl -s "${API}/iban/validate?iban=DE89370400440532013000" \\
  -H "Authorization: Bearer sk_xxx"`,
          ),
        ],
      },
      {
        id: "response",
        title: "3. Read the response",
        body: "Every successful response wraps the payload in a data object and echoes a request_id in meta — include it when contacting support.",
        code: [
          code(
            "json",
            `{
  "data": {
    "valid": true,
    "iban": "DE89370400440532013000",
    "country": "DE",
    "check_digits": "89",
    "bank_code": "37040044",
    "account_number": "0532013000",
    "length": 22,
    "expected_length": 22
  },
  "meta": { "request_id": "req_1a2b3c4d" }
}`,
          ),
        ],
      },
      {
        id: "next-steps",
        title: "Next steps",
        body: "Grab a dependency-free client from the SDKs page, browse the endpoint reference for SWIFT, routing and local identifier lookups, or read the error handling guide before you ship to production.",
      },
    ],
  },
  {
    slug: "authentication",
    title: "Authentication",
    description: "API keys, Bearer authentication and key rotation.",
    group: "getting-started",
    sections: [
      {
        id: "bearer",
        title: "Bearer authentication",
        body: "All API requests require an API key in the Authorization header. Keys use the sk_ prefix followed by a random secret.",
        code: [
          code("http", `Authorization: Bearer sk_xxx`, "Header"),
          code(
            "bash",
            `curl -s "${API}/banks" \
  -H "Authorization: Bearer sk_xxx"`,
            "cURL",
          ),
        ],
      },
      {
        id: "security",
        title: "Keeping keys safe",
        body: "Only the key hash is stored server-side. Never commit keys to source control; use environment variables or a secrets manager. Rotate keys from the dashboard — old keys keep working for a configurable grace period to avoid downtime.",
      },
      {
        id: "errors",
        title: "Authentication errors",
        table: {
          headers: ["Code", "HTTP", "Description"],
          rows: [
            ["UNAUTHORIZED", "401", "Missing or invalid API key."],
            ["FORBIDDEN", "403", "The key does not have access to this endpoint."],
          ],
        },
      },
    ],
  },
  {
    slug: "errors",
    title: "Errors",
    description: "The unified error envelope and error codes.",
    group: "getting-started",
    sections: [
      {
        id: "envelope",
        title: "Error envelope",
        body: "Failures always return a JSON envelope with an error object containing a machine-readable code, a human-readable message and the request_id.",
        code: [
          code(
            "json",
            `{
  "error": {
    "code": "INVALID_IBAN",
    "message": "The IBAN format is invalid",
    "request_id": "req_5e6f7a8b"
  }
}`,
          ),
        ],
      },
      {
        id: "codes",
        title: "Error codes",
        table: {
          headers: ["Code", "HTTP", "Description"],
          rows: [
            ["INVALID_IBAN", "422", "The IBAN failed format, checksum or structure validation."],
            ["INVALID_SWIFT", "422", "The code is not a valid 8 or 11 character BIC."],
            ["INVALID_ROUTING", "422", "The routing number failed checksum validation."],
            ["NOT_FOUND", "404", "The identifier does not exist in the dataset."],
            ["UNAUTHORIZED", "401", "Missing or invalid API key."],
            ["RATE_LIMITED", "429", "Rate limit exceeded — retry after the indicated delay."],
            ["QUOTA_EXCEEDED", "402", "Monthly request quota exhausted."],
            ["INTERNAL", "500", "Unexpected server error — retry with backoff."],
          ],
        },
      },
      {
        id: "retries",
        title: "Retries",
        body: "Retry 429 and 5xx responses with exponential backoff. The Retry-After header indicates the earliest time the next request will be accepted. Never retry 4xx validation errors with the same payload.",
      },
    ],
  },
  {
    slug: "rate-limits",
    title: "Rate limits",
    description: "Request quotas, rate limit headers and backoff behavior.",
    group: "getting-started",
    sections: [
      {
        id: "limits",
        title: "Limits by plan",
        table: {
          headers: ["Plan", "Requests / month", "Burst rate limit"],
          rows: [
            ["Free", "100", "5 req/s"],
            ["Developer", "10,000", "10 req/s"],
            ["Startup", "50,000", "25 req/s"],
            ["Business", "500,000", "50 req/s"],
            ["Enterprise", "Custom", "Custom"],
          ],
        },
      },
      {
        id: "headers",
        title: "Rate limit headers",
        body: "Every response includes headers describing your current usage. When a 429 is returned, Retry-After states the seconds to wait.",
        table: {
          headers: ["Header", "Description"],
          rows: [
            ["X-RateLimit-Limit", "Burst requests allowed per second."],
            ["X-RateLimit-Remaining", "Requests remaining in the current window."],
            ["X-RateLimit-Reset", "Unix timestamp when the window resets."],
            ["Retry-After", "Seconds to wait (only present on 429)."],
          ],
        },
      },
    ],
  },

  // ── Endpoints ───────────────────────────────────────────────────────────
  {
    slug: "iban",
    title: "IBAN validation & bank lookup",
    description:
      "Validate IBAN format, country, length, MOD-97 checksum and BBAN structure, and resolve the bank behind the IBAN (SWIFT/BIC).",
    group: "endpoints",
    sections: [
      {
        id: "endpoint",
        title: "Endpoint",
        body: "Validates an IBAN end-to-end: normalization, country support, length, allowed characters, MOD-97 checksum, national structure and BBAN segment parsing.",
        code: [code("http", `GET ${API}/iban/validate?iban={iban}`)],
      },
      {
        id: "parameters",
        title: "Parameters",
        table: {
          headers: ["Name", "Type", "In", "Description"],
          rows: [
            ["iban", "string", "query", "The IBAN to validate. Spaces and dashes are stripped; input is uppercased."],
          ],
        },
      },
      {
        id: "example",
        title: "Example request",
        code: [
          code(
            "bash",
            `curl -s "${API}/iban/validate?iban=DE89 3704 0044 0532 0130 00" \\
  -H "Authorization: Bearer sk_xxx"`,
          ),
        ],
      },
      {
        id: "response",
        title: "Example response",
        code: [
          code(
            "json",
            `{
  "data": {
    "valid": true,
    "iban": "DE89370400440532013000",
    "country": "DE",
    "check_digits": "89",
    "bank_code": "37040044",
    "account_number": "0532013000",
    "length": 22,
    "expected_length": 22,
    "checks": {
      "charset": true,
      "country": true,
      "length": true,
      "checksum": true,
      "structure": true
    }
  },
  "meta": { "request_id": "req_1a2b3c4d" }
}`,
          ),
        ],
      },
      {
        id: "errors",
        title: "Errors",
        table: {
          headers: ["Code", "Description"],
          rows: [
            ["INVALID_IBAN", "The IBAN failed format, checksum or structure validation."],
            ["IBAN_UNSUPPORTED_COUNTRY", "The country does not participate in IBAN."],
            ["MISSING_PARAMETER", "The iban query parameter is absent."],
          ],
        },
      },
      {
        id: "bank-lookup",
        title: "Bank lookup",
        body: "The lookup endpoint validates the IBAN and resolves the bank behind it, local-first: the BBAN bank code is mapped through the FinCode bank-code → SWIFT/BIC directory, and the SWIFT directory supplies the institution details. Unknown banks are enriched from the upstream provider and persisted, so later lookups hit the directory directly. A valid IBAN whose bank is not in the directory yet still returns valid: true — the bank field is simply omitted.",
        code: [code("http", `GET ${API}/iban/{iban}`)],
      },
      {
        id: "bank-lookup-parameters",
        title: "Parameters",
        table: {
          headers: ["Name", "Type", "In", "Description"],
          rows: [
            ["iban", "string", "path", "The IBAN to validate and enrich with bank details."],
          ],
        },
      },
      {
        id: "bank-lookup-example",
        title: "Example request",
        code: [
          code(
            "bash",
            `curl -s "${API}/iban/DE16200700000532013000" \\
  -H "Authorization: Bearer sk_xxx"`,
          ),
        ],
      },
      {
        id: "bank-lookup-response",
        title: "Example response",
        code: [
          code(
            "json",
            `{
  "data": {
    "valid": true,
    "iban": "DE16200700000532013000",
    "country": "DE",
    "check_digits": "16",
    "bank_code": "20070000",
    "account_number": "0532013000",
    "length": 22,
    "expected_length": 22,
    "bank": {
      "swift_code": "DEUTDEHH",
      "bic": "DEUTDEHH",
      "bank": {
        "name_en": "DEUTSCHE BANK AG",
        "country": "DE"
      },
      "city": "Hamburg",
      "status": "ACTIVE"
    }
  },
  "meta": { "request_id": "req_5f8d2c41" }
}`,
          ),
        ],
      },
      {
        id: "bank-lookup-notes",
        title: "Notes",
        body: "This endpoint is also available anonymously for the website IBAN checker and is rate-limited per network address. Bank availability never affects the validity result — validation is a pure format and checksum computation.",
      },
      {
        id: "notes",
        title: "Notes",
        body: "A valid IBAN confirms format, length and checksum — it does not confirm that the account exists. FinCode never claims account existence from format validation alone.",
      },
    ],
  },
  swiftDoc,
  routingDoc,
  sortCodeDoc,
  bsbDoc,
  ifscDoc,
  cnapsDoc,
  binDoc,
  {
    slug: "banks",
    title: "Bank directory API",
    description: "Search, list and inspect financial institutions.",
    group: "endpoints",
    sections: [
      {
        id: "endpoints",
        title: "Endpoints",
        code: [
          code(
            "http",
            `GET ${API}/banks
GET ${API}/banks/{id}
GET ${API}/banks/search?q=
GET ${API}/banks/{id}/branches`,
          ),
        ],
      },
      {
        id: "list",
        title: "List and search",
        body: "List supports cursor pagination (limit, cursor). Search matches the English name, local name and short name, and returns the same envelope as list.",
        table: {
          headers: ["Name", "Type", "In", "Description"],
          rows: [
            ["q", "string", "query", "Search term for /banks/search."],
            ["limit", "integer", "query", "Page size, 1–100. Defaults to 20."],
            ["cursor", "string", "query", "Pagination cursor from the previous response."],
            ["country", "string", "query", "Filter by ISO 3166-1 alpha-2 country code."],
          ],
        },
      },
      {
        id: "example",
        title: "Example request",
        code: [
          code(
            "bash",
            `curl -s "${API}/banks/search?q=chase&limit=5" \\
  -H "Authorization: Bearer sk_xxx"`,
          ),
        ],
      },
      {
        id: "response",
        title: "Example response",
        code: [
          code(
            "json",
            `{
  "data": [
    {
      "id": "inst_jpmorgan",
      "name_en": "JPMorgan Chase Bank, N.A.",
      "short_name": "JPMorgan Chase",
      "country": "US",
      "identifiers": [
        { "type": "SWIFT", "value": "CHASUS33" },
        { "type": "ABA_ROUTING", "value": "021000021" }
      ]
    }
  ],
  "meta": { "request_id": "req_2c4e6g8i", "next_cursor": null }
}`,
          ),
        ],
      },
    ],
  },
  {
    slug: "countries",
    title: "Country API",
    description: "Country reference data and per-country IBAN formats.",
    group: "endpoints",
    sections: [
      {
        id: "endpoints",
        title: "Endpoints",
        code: [
          code(
            "http",
            `GET ${API}/countries
GET ${API}/countries/{code}
GET ${API}/countries/{code}/iban-format`,
          ),
        ],
      },
      {
        id: "example",
        title: "Example request",
        code: [
          code(
            "bash",
            `curl -s "${API}/countries/DE/iban-format" \\
  -H "Authorization: Bearer sk_xxx"`,
          ),
        ],
      },
      {
        id: "response",
        title: "Example response",
        code: [
          code(
            "json",
            `{
  "data": {
    "country_code": "DE",
    "iban_length": 22,
    "structure": "DEkk BBBB BBBB BBBB BBBB BB",
    "bank_identifier_position": { "start": 5, "length": 8 },
    "account_number_position": { "start": 13, "length": 10 },
    "example": "DE89370400440532013000"
  },
  "meta": { "request_id": "req_9i8h7g6f" }
}`,
          ),
        ],
      },
    ],
  },
  {
    slug: "lookup",
    title: "Universal lookup",
    description: "Detect and resolve any identifier type with one endpoint.",
    group: "endpoints",
    sections: [
      {
        id: "endpoint",
        title: "Endpoint",
        body: "The universal lookup detects the identifier type from the input — IBAN, SWIFT/BIC, routing number, sort code, BSB, IFSC or CNAPS — resolves it to the underlying entity, and returns the same result shape as the typed endpoints.",
        code: [code("http", `GET ${API}/lookup?q={value}`)],
      },
      {
        id: "example",
        title: "Example request",
        code: [
          code(
            "bash",
            `curl -s "${API}/lookup?q=ICBKCNBJ" \\
  -H "Authorization: Bearer sk_xxx"`,
          ),
        ],
      },
      {
        id: "response",
        title: "Example response",
        code: [
          code(
            "json",
            `{
  "data": {
    "query": "ICBKCNBJ",
    "detected_type": "SWIFT",
    "resolved": true,
    "identifier": {
      "type": "SWIFT",
      "value": "ICBKCNBJ",
      "bank": {
        "id": "inst_icbc",
        "name_en": "Industrial and Commercial Bank of China",
        "country": "CN"
      }
    }
  },
  "meta": { "request_id": "req_4k5m6n7p" }
}`,
          ),
        ],
      },
      {
        id: "notes",
        title: "Notes",
        body: "When the type cannot be detected (detected_type is UNKNOWN), the response lists the closest candidates instead of failing, mirroring the website's universal search.",
      },
    ],
  },

  // ── Reference ───────────────────────────────────────────────────────────
  {
    slug: "api-reference",
    title: "API reference",
    description: "Every V1 endpoint at a glance.",
    group: "reference",
    sections: [
      {
        id: "endpoints",
        title: "Data API",
        body: "Authenticated with an API key: Authorization: Bearer sk_...",
        table: {
          headers: ["Method", "Path", "Description"],
          rows: [
            ["GET", "/v1/iban/validate?iban=", "Validate an IBAN."],
            ["GET", "/v1/iban/{iban}", "Validate an IBAN and resolve the bank (SWIFT/BIC, local-first)."],
            ["GET", "/v1/swift/{code}", "Look up a SWIFT/BIC code."],
            ["GET", "/v1/routing/{number}", "Look up a US routing number."],
            ["GET", "/v1/sort-code/{code}", "Look up a UK sort code."],
            ["GET", "/v1/bsb/{code}", "Look up an Australian BSB."],
            ["GET", "/v1/ifsc/{code}", "Look up an Indian IFSC."],
            ["GET", "/v1/cnaps/{code}", "Look up a China CNAPS code."],
            ["GET", "/v1/bin/{bin}", "Look up a card BIN/IIN (brand, type and issuer)."],
            ["GET", "/v1/banks", "List financial institutions."],
            ["GET", "/v1/banks/{id}", "Get one institution."],
            ["GET", "/v1/banks/search?q=", "Search institutions by name."],
            ["GET", "/v1/banks/by-slug/{slug}", "Get one institution by its URL slug."],
            ["GET", "/v1/banks/{id}/branches", "List branches of an institution."],
            ["GET", "/v1/countries", "List countries."],
            ["GET", "/v1/countries/{code}", "Get one country."],
            ["GET", "/v1/countries/{code}/iban-format", "Get the IBAN format for a country."],
            ["GET", "/v1/lookup?q=", "Universal identifier lookup."],
          ],
        },
      },
      {
        id: "portal-endpoints",
        title: "Developer portal",
        body: "Account, organization, API key, billing and usage endpoints. Authenticated with a JWT access token from POST /v1/auth/login: Authorization: Bearer <access_token>.",
        table: {
          headers: ["Method", "Path", "Description"],
          rows: [
            ["POST", "/v1/auth/register", "Create an account and its personal organization."],
            ["POST", "/v1/auth/login", "Exchange email and password for access and refresh tokens."],
            ["POST", "/v1/auth/refresh", "Rotate a refresh token; the presented token is revoked."],
            ["POST", "/v1/auth/logout", "Revoke the presented refresh token."],
            ["GET", "/v1/auth/me", "Current account profile and organizations."],
            ["POST", "/v1/auth/password-reset/request", "Request a single-use password reset token."],
            ["POST", "/v1/auth/password-reset/confirm", "Consume a reset token and set a new password."],
            ["GET", "/v1/organizations", "Organizations of the current account."],
            ["GET", "/v1/organizations/{id}", "Get one organization."],
            ["GET", "/v1/organizations/{id}/members", "List members of an organization."],
            ["POST", "/v1/organizations/{id}/members", "Add a member by email (OWNER or ADMIN)."],
            ["PATCH", "/v1/organizations/{id}/members/{memberId}", "Change a member role (OWNER only)."],
            ["DELETE", "/v1/organizations/{id}/members/{memberId}", "Remove a member (OWNER or ADMIN)."],
            ["POST", "/v1/api-keys", "Create an API key; the plaintext key is returned once."],
            ["GET", "/v1/api-keys", "List API keys of the organization."],
            ["DELETE", "/v1/api-keys/{id}", "Revoke an API key (idempotent)."],
            ["POST", "/v1/api-keys/{id}/rotate", "Revoke and replace an API key."],
            ["GET", "/v1/usage", "Usage summary with quota for the current month."],
            ["GET", "/v1/usage/endpoints", "Per-endpoint request counts and error rates."],
            ["GET", "/v1/usage/daily", "Daily request counts for charts."],
            ["GET", "/v1/usage/keys", "Per-API-key request totals."],
            ["GET", "/v1/billing", "Subscription, plan and entitlement summary."],
            ["POST", "/v1/billing/checkout", "Start a subscription checkout for a plan (OWNER only)."],
            ["POST", "/v1/billing/subscriptions/{subscriptionId}/confirm", "Confirm a checkout after approval (OWNER only)."],
            ["POST", "/v1/billing/subscriptions/{subscriptionId}/revise", "Upgrade or downgrade a subscription (OWNER only)."],
            ["POST", "/v1/billing/subscriptions/{subscriptionId}/cancel", "Cancel a subscription (OWNER only)."],
            ["GET", "/v1/billing/invoices?subscription_id=", "Invoices of a subscription."],
          ],
        },
      },
      {
        id: "base-url",
        title: "Base URL",
        code: [code("http", `Production: ${API}\nDevelopment: http://localhost:8080/v1`)],
      },
    ],
  },
  {
    slug: "sdks",
    title: "SDKs & client libraries",
    description:
      "Dependency-free reference clients for TypeScript and Python, plus standard-library examples for Java, Go and PHP — with auth, timeouts, retries and typed errors built in.",
    group: "reference",
    sections: [
      {
        id: "clients",
        title: "Client libraries",
        body: "The API is plain HTTPS plus JSON, so any HTTP client works. The reference clients below only add what every integration eventually needs: Bearer authentication, per-attempt timeouts, retries with exponential backoff and errors that carry the request id. They are single dependency-free files — copy one into your project rather than installing a package.",
        table: {
          headers: ["Language", "Client", "Runtime", "File"],
          rows: [
            ["TypeScript / JavaScript", "FinCode class", "Node 18+, Bun, Deno, browsers", "fincode.ts"],
            ["Python", "FinCode class", "Python 3.9+ (standard library)", "fincode.py"],
            ["Java", "HTTP example", "JDK 11+ (java.net.http)", "—"],
            ["Go", "HTTP example", "Go 1.20+ (net/http)", "—"],
            ["PHP", "HTTP example", "PHP 8+ (curl)", "—"],
          ],
        },
      },
      {
        id: "download",
        title: "Download",
        body: "Both reference clients track API V1 and ship with the documentation. Save them into your source tree and import them directly — no package manager involved.",
        code: [
          code(
            "bash",
            `# TypeScript / JavaScript
curl -O ${SITE}/sdk/fincode.ts

# Python
curl -O ${SITE}/sdk/fincode.py`,
          ),
        ],
      },
      {
        id: "quickstart",
        title: "Quickstart",
        body: "Construct one client per process and reuse it. Every call resolves to the { data, meta } envelope; meta.request_id identifies the call in support conversations.",
        code: [
          code(
            "ts",
            `import { FinCode } from "./fincode";

const fincode = new FinCode({ apiKey: process.env.FINCODE_API_KEY! });

const { data, meta } = await fincode.iban.validate("DE89370400440532013000");

console.log(data.valid);       // true
console.log(data.bank_code);   // "37040044"
console.log(meta.request_id);  // "req_1a2b3c4d"`,
            "TypeScript",
          ),
          code(
            "python",
            `import os
from fincode import FinCode

fincode = FinCode(api_key=os.environ["FINCODE_API_KEY"])

response = fincode.iban.validate("DE89370400440532013000")

print(response.data["valid"])      # True
print(response.data["bank_code"])  # "37040044"
print(response.request_id)         # "req_1a2b3c4d"`,
            "Python",
          ),
          code(
            "java",
            `HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create(BASE_URL + "/swift/ICBKCNBJ"))
    .header("Authorization", "Bearer " + System.getenv("FINCODE_API_KEY"))
    .timeout(Duration.ofSeconds(10))
    .GET()
    .build();

HttpResponse<String> response = HttpClient.newHttpClient()
    .send(request, HttpResponse.BodyHandlers.ofString());`,
            "Java",
          ),
          code(
            "go",
            `req, err := http.NewRequest(http.MethodGet, baseURL+"/swift/ICBKCNBJ", nil)
if err != nil {
    log.Fatal(err)
}
req.Header.Set("Authorization", "Bearer "+os.Getenv("FINCODE_API_KEY"))

client := &http.Client{Timeout: 10 * time.Second}
resp, err := client.Do(req)
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close()`,
            "Go",
          ),
          code(
            "php",
            `$ch = curl_init(BASE_URL . "/swift/ICBKCNBJ");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => ["Authorization: Bearer " . getenv("FINCODE_API_KEY")],
]);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);`,
            "PHP",
          ),
        ],
      },
      {
        id: "configuration",
        title: "Configuration",
        body: "Only the API key is required. Timeouts and retries have production-friendly defaults, and every option can be overridden per client.",
        table: {
          headers: ["Option", "Default", "Description"],
          rows: [
            ["apiKey / api_key", "required", "Key with the sk_ prefix, sent as Authorization: Bearer."],
            ["baseUrl / base_url", API, "Base URL including the version segment."],
            ["timeoutMs / timeout", "10000 ms", "Per-attempt timeout; a timeout is retried like a network error."],
            ["maxRetries", "2", "Retries after the first attempt for 429, 502, 503, 504 and network errors."],
            ["fetch", "globalThis.fetch", "Custom transport for tests or proxies (TypeScript only)."],
          ],
        },
      },
      {
        id: "methods",
        title: "Method reference",
        body: "Each method maps to one REST endpoint and resolves to { data, meta }. TypeScript uses camelCase, Python uses snake_case; both expose the same arguments. For anything else, call request(method, path, options) directly.",
        table: {
          headers: ["Method", "REST endpoint"],
          rows: [
            ["fincode.iban.validate(iban)", "GET /v1/iban/validate?iban="],
            ["fincode.iban.lookup(iban)", "GET /v1/iban/{iban}"],
            ["fincode.swift.get(code)", "GET /v1/swift/{code}"],
            ["fincode.routing.get(number)", "GET /v1/routing/{number}"],
            ["fincode.sortCode.get(code) / sort_code", "GET /v1/sort-code/{code}"],
            ["fincode.bsb.get(code)", "GET /v1/bsb/{code}"],
            ["fincode.ifsc.get(code)", "GET /v1/ifsc/{code}"],
            ["fincode.cnaps.get(code)", "GET /v1/cnaps/{code}"],
            ["fincode.bin.get(bin)", "GET /v1/bin/{bin}"],
            ["fincode.banks.list({ country, cursor, limit })", "GET /v1/banks"],
            ["fincode.banks.search(q, { country, cursor, limit })", "GET /v1/banks/search?q="],
            ["fincode.banks.get(id)", "GET /v1/banks/{id}"],
            ["fincode.banks.bySlug(slug) / by_slug", "GET /v1/banks/by-slug/{slug}"],
            ["fincode.banks.branches(id, { q, city, cursor, limit })", "GET /v1/banks/{id}/branches"],
            ["fincode.countries.list() / get(code)", "GET /v1/countries, /v1/countries/{code}"],
            ["fincode.countries.ibanFormat(code) / iban_format", "GET /v1/countries/{code}/iban-format"],
            ["fincode.lookup.get(q)", "GET /v1/lookup?q="],
          ],
        },
      },
      {
        id: "errors",
        title: "Errors and retries",
        body: "Non-2xx responses raise FinCodeError with the machine-readable code, the HTTP status and the request id. 429, 502, 503 and 504 — and network failures or timeouts — are retried with exponential backoff (honouring Retry-After) before the error surfaces. Other 4xx validation errors are never retried.",
        code: [
          code(
            "ts",
            `import { FinCodeError } from "./fincode";

try {
  await fincode.swift.get("NOPE");
} catch (error) {
  if (error instanceof FinCodeError) {
    console.error(error.code);       // "INVALID_SWIFT"
    console.error(error.status);     // 422
    console.error(error.requestId);  // "req_5e6f7a8b"
  }
  throw error;
}`,
            "TypeScript",
          ),
          code(
            "python",
            `from fincode import FinCodeError

try:
    fincode.swift.get("NOPE")
except FinCodeError as error:
    print(error.code)        # "INVALID_SWIFT"
    print(error.status)      # 422
    print(error.request_id)  # "req_5e6f7a8b"`,
            "Python",
          ),
        ],
      },
      {
        id: "pagination",
        title: "Pagination",
        body: "Directory collections are cursor paginated: pass meta.next_cursor back as cursor, and stop when it is null. The Python client also exposes an iter_pages helper.",
        code: [
          code(
            "ts",
            `const banks = [];
let cursor: string | null | undefined;

do {
  const page = await fincode.banks.list({ country: "US", limit: 100, cursor });
  banks.push(...page.data);
  cursor = page.meta.next_cursor;
} while (cursor);`,
            "TypeScript",
          ),
          code(
            "python",
            `for page in fincode.iter_pages("/banks", {"country": "US"}):
    for bank in page.data:
        print(bank["name_en"])`,
            "Python",
          ),
        ],
      },
      {
        id: "request-ids",
        title: "Request IDs",
        body: "Every response — success or failure — carries a request id in meta.request_id or error.request_id. Log it next to your own correlation id: it links the call to the server-side log entry, which is what support needs to reproduce an issue.",
      },
      {
        id: "versioning",
        title: "Versioning and support",
        body: "The clients target API V1 (base path /v1). Payloads are additive within V1 — new fields may appear at any time — so read by key instead of by position and ignore unknown fields. Breaking changes ship under a new version prefix. Java, Go and PHP wrappers are on the roadmap; until then the standard-library examples above need no dependency.",
      },
    ],
  },
  {
    slug: "changelog",
    title: "Changelog",
    description: "Release history of the FinCode API.",
    group: "reference",
    sections: [
      {
        id: "v1-0-0",
        title: "2026-09 — V1.0.0",
        body: "Initial public release. IBAN validation with MOD-97 checksum and BBAN parsing; SWIFT/BIC, US routing, UK sort code, BSB, IFSC and CNAPS lookups; bank and country directories; universal lookup; unified {data, meta} envelope with request IDs; API keys with hash-only storage and per-plan rate limits.",
      },
    ],
  },
];

export const docBySlug: Record<string, DocPage> = Object.fromEntries(
  docPages.map((page) => [page.slug, page]),
);

export const docGroups = [
  { key: "getting-started", pages: docPages.filter((p) => p.group === "getting-started") },
  { key: "endpoints", pages: docPages.filter((p) => p.group === "endpoints") },
  { key: "reference", pages: docPages.filter((p) => p.group === "reference") },
] as const;
