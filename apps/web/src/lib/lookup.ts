/**
 * Anonymous lookup boxes rendered on the identifier directory pages.
 *
 * Each family is answered by a public /v1 endpoint (see
 * ApiScopes.PUBLIC_IDENTIFIER_PREFIXES in apps/api). They all share one
 * per-IP token bucket, so a visitor gets the same allowance no matter which
 * of the tools they use - the same budget as the IBAN checker.
 *
 * Kept free of data imports: this module is pulled into a client component.
 */
export type LookupType = "SWIFT" | "ABA_ROUTING" | "SORT_CODE" | "BSB" | "IFSC" | "CNAPS";

export interface LookupTypeConfig {
  /** Path segment of the public API endpoint, e.g. "sort-code" for /v1/sort-code. */
  endpoint: string;
  /** Prefix of this family's copy under the `tool` namespace, e.g. "sortCode". */
  messageKey: string;
  /** Directory route that renders the per-code page. Mirrors identifierTypeConfigs. */
  basePath: string;
  /** Shape check run in the browser so a typo does not spend a lookup. */
  pattern: RegExp;
  /** Canonical form sent to the API; the server normalises the same way. */
  normalize: (raw: string) => string;
  placeholder: string;
  inputMode: "numeric" | "text";
  /** Payload field holding the code that was looked up. */
  valueKey: string;
}

const digits = (raw: string) => raw.replace(/[\s-]/g, "");

export const lookupConfigs: Record<LookupType, LookupTypeConfig> = {
  SWIFT: {
    endpoint: "swift",
    messageKey: "swift",
    basePath: "/swift-codes",
    pattern: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
    normalize: (raw) => raw.replace(/[\s-]/g, "").toUpperCase(),
    placeholder: "ICBKCNBJ",
    inputMode: "text",
    valueKey: "swift_code",
  },
  ABA_ROUTING: {
    endpoint: "routing",
    messageKey: "routing",
    basePath: "/routing-numbers",
    pattern: /^\d{9}$/,
    normalize: digits,
    placeholder: "021000021",
    inputMode: "numeric",
    valueKey: "routing_number",
  },
  SORT_CODE: {
    endpoint: "sort-code",
    messageKey: "sortCode",
    basePath: "/sort-codes",
    pattern: /^\d{6}$/,
    normalize: digits,
    placeholder: "20-00-00",
    inputMode: "numeric",
    valueKey: "sort_code",
  },
  BSB: {
    endpoint: "bsb",
    messageKey: "bsb",
    basePath: "/bsb",
    pattern: /^\d{6}$/,
    normalize: digits,
    placeholder: "062-001",
    inputMode: "numeric",
    valueKey: "bsb",
  },
  IFSC: {
    endpoint: "ifsc",
    messageKey: "ifsc",
    basePath: "/ifsc",
    pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    normalize: (raw) => raw.replace(/[\s-]/g, "").toUpperCase(),
    placeholder: "SBIN0001234",
    inputMode: "text",
    valueKey: "ifsc",
  },
  CNAPS: {
    endpoint: "cnaps",
    messageKey: "cnaps",
    basePath: "/cnaps",
    pattern: /^\d{12}$/,
    normalize: digits,
    placeholder: "102100099996",
    inputMode: "numeric",
    valueKey: "cnaps",
  },
};
