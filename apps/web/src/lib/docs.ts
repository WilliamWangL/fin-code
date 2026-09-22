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
  -H "Authorization: Bearer sk_test_xxx"`,
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
  -H "Authorization: Bearer sk_test_xxx"`,
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
  -H "Authorization: Bearer sk_test_xxx"`,
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
  -H "Authorization: Bearer sk_test_xxx"`,
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
  -H "Authorization: Bearer sk_test_xxx"`,
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
  -H "Authorization: Bearer sk_test_xxx"`,
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
        body: "Sign up and generate a test key from the dashboard. Keys use the sk_test_ prefix in development and sk_live_ in production. Keys are shown once — store them somewhere safe and rotate them from the dashboard at any time.",
      },
      {
        id: "first-request",
        title: "2. Make your first request",
        body: "All requests authenticate with the Authorization header. The example below validates an IBAN and returns the parsed bank code.",
        code: [
          code(
            "bash",
            `curl -s "${API}/iban/validate?iban=DE89370400440532013000" \\
  -H "Authorization: Bearer sk_test_xxx"`,
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
        body: "Browse the endpoint reference for SWIFT, routing and local identifier lookups, or read the error handling guide before you ship to production.",
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
        body: "All API requests require an API key in the Authorization header. Two key types exist: sk_test_ for the sandbox and sk_live_ for production traffic.",
        code: [
          code("http", `Authorization: Bearer sk_test_xxx`),
          code(
            "bash",
            `curl -s "${API}/banks" \\
  -H "Authorization: Bearer sk_live_xxx"`,
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
            ["Free", "500", "5 req/s"],
            ["Developer", "20,000", "10 req/s"],
            ["Startup", "100,000", "25 req/s"],
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
    title: "IBAN validation",
    description:
      "Validate IBAN format, country, length, MOD-97 checksum and BBAN structure.",
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
  -H "Authorization: Bearer sk_test_xxx"`,
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
  -H "Authorization: Bearer sk_test_xxx"`,
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
  -H "Authorization: Bearer sk_test_xxx"`,
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
  -H "Authorization: Bearer sk_test_xxx"`,
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
        body: "Authenticated with an API key: Authorization: Bearer sk_test_... (or sk_live_...).",
        table: {
          headers: ["Method", "Path", "Description"],
          rows: [
            ["GET", "/v1/iban/validate?iban=", "Validate an IBAN."],
            ["GET", "/v1/swift/{code}", "Look up a SWIFT/BIC code."],
            ["GET", "/v1/routing/{number}", "Look up a US routing number."],
            ["GET", "/v1/sort-code/{code}", "Look up a UK sort code."],
            ["GET", "/v1/bsb/{code}", "Look up an Australian BSB."],
            ["GET", "/v1/ifsc/{code}", "Look up an Indian IFSC."],
            ["GET", "/v1/cnaps/{code}", "Look up a China CNAPS code."],
            ["GET", "/v1/banks", "List financial institutions."],
            ["GET", "/v1/banks/{id}", "Get one institution."],
            ["GET", "/v1/banks/search?q=", "Search institutions by name."],
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
        body: "Account, organization, API key and usage endpoints. Authenticated with a JWT access token from POST /v1/auth/login: Authorization: Bearer <access_token>.",
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
    title: "SDKs",
    description: "Official SDKs for JavaScript, Python, Java, Go and PHP.",
    group: "reference",
    sections: [
      {
        id: "javascript",
        title: "JavaScript / TypeScript",
        code: [
          code(
            "ts",
            `import { FinCode } from "@fincode/javascript";

const fincode = new FinCode({ apiKey: process.env.FINCODE_API_KEY! });

const result = await fincode.iban.validate("DE89370400440532013000");
if (result.valid) {
  console.log(result.bank_code); // "37040044"
}`,
          ),
        ],
      },
      {
        id: "python",
        title: "Python",
        code: [
          code(
            "python",
            `from fincode import FinCode

fincode = FinCode(api_key=os.environ["FINCODE_API_KEY"])

result = fincode.swift.get("ICBKCNBJ")
print(result.bank.name_en)  # Industrial and Commercial Bank of China`,
          ),
        ],
      },
      {
        id: "java",
        title: "Java",
        code: [
          code(
            "java",
            `FinCodeClient client = FinCodeClient.builder()
    .apiKey(System.getenv("FINCODE_API_KEY"))
    .build();

IbanValidation result = client.iban().validate("DE89370400440532013000");
System.out.println(result.isValid());`,
          ),
        ],
      },
      {
        id: "go",
        title: "Go",
        code: [
          code(
            "go",
            `client := fincode.New(os.Getenv("FINCODE_API_KEY"))

result, err := client.Iban.Validate(ctx, "DE89370400440532013000")
if err != nil { log.Fatal(err) }
fmt.Println(result.BankCode)`,
          ),
        ],
      },
      {
        id: "php",
        title: "PHP",
        code: [
          code(
            "php",
            `$client = new FinCode\\Client(getenv("FINCODE_API_KEY"));

$result = $client->iban->validate("DE89370400440532013000");
echo $result->valid ? "valid" : "invalid";`,
          ),
        ],
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
