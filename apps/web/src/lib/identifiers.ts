import type { IdentifierType } from "@/lib/data/types";
import { ibanFormatByCountry } from "@/lib/data/iban-formats";

/** Detected type values returned by the universal search API (spec §11). */
export type DetectedType =
  | "IBAN"
  | "SWIFT"
  | "BIC"
  | "ROUTING"
  | "SORT_CODE"
  | "BSB"
  | "IFSC"
  | "CNAPS"
  | "BANK"
  | "BRANCH"
  | "UNKNOWN";

const SWIFT_RE = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const IBAN_RE = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/;

/**
 * Detect the identifier type of a raw user query.
 *
 * Detection is purely format-based (spec §11); ambiguous 6-digit values are
 * reported as SORT_CODE and matched against both sort code and BSB datasets
 * by the search layer.
 */
export function detectIdentifierType(raw: string): DetectedType {
  const value = raw.replace(/[\s-]/g, "").toUpperCase();
  if (!value) return "UNKNOWN";

  if (IBAN_RE.test(value) && ibanFormatByCountry[value.slice(0, 2)]) return "IBAN";
  if (IFSC_RE.test(value)) return "IFSC";
  if (SWIFT_RE.test(value)) return "SWIFT";
  if (/^\d{12}$/.test(value)) return "CNAPS";
  if (/^\d{9}$/.test(value)) return "ROUTING";
  if (/^\d{6}$/.test(value)) return "SORT_CODE";
  if (/[a-z]/i.test(raw)) return "BANK";
  return "UNKNOWN";
}

/** Normalize raw input into the canonical identifier value. */
export function normalizeIdentifier(
  type: IdentifierType | "IBAN",
  value: string,
): string {
  const compact = value.replace(/[\s-]/g, "").toUpperCase();
  return compact;
}

export interface FormatCheck {
  valid: boolean;
  detail: string;
}

/** SWIFT/BIC format validation (ISO 9362): 8 or 11 characters, BBBB CC LL [bbb]. */
export function checkSwiftFormat(value: string): FormatCheck {
  const compact = value.replace(/[\s-]/g, "").toUpperCase();
  if (!SWIFT_RE.test(compact)) {
    return {
      valid: false,
      detail:
        "A BIC must be 8 or 11 characters: 4-letter institution code, 2-letter ISO country code, 2-character location code, optional 3-character branch code.",
    };
  }
  const parts = {
    institution: compact.slice(0, 4),
    country: compact.slice(4, 6),
    location: compact.slice(6, 8),
    branch: compact.length === 11 ? compact.slice(8, 11) : undefined,
  };
  const detail =
    parts.branch && parts.branch === "XXX"
      ? `${parts.institution} (institution) · ${parts.country} (country) · ${parts.location} (location) · ${parts.branch} (head office)`
      : `${parts.institution} (institution) · ${parts.country} (country) · ${parts.location} (location)${parts.branch ? ` · ${parts.branch} (branch)` : ""}`;
  return { valid: true, detail };
}

/** US ABA routing number checksum (weights 3, 7, 1 repeating). */
export function checkAbaFormat(value: string): FormatCheck {
  const compact = value.replace(/[\s-]/g, "");
  if (!/^\d{9}$/.test(compact)) {
    return { valid: false, detail: "A routing number must be exactly 9 digits." };
  }
  const digits = compact.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const weight = [3, 7, 1][i % 3];
    sum += digits[i] * weight;
  }
  const valid = (10 - (sum % 10)) % 10 === digits[8];
  return {
    valid,
    detail: valid
      ? "The checksum digit is valid (ABA weighting 3-7-1)."
      : "The checksum digit does not match the ABA weighting algorithm.",
  };
}

/** UK sort code format check (6 digits, displayed xx-xx-xx). */
export function checkSortCodeFormat(value: string): FormatCheck {
  const compact = value.replace(/[\s-]/g, "");
  if (!/^\d{6}$/.test(compact)) {
    return { valid: false, detail: "A sort code must be exactly 6 digits." };
  }
  return {
    valid: true,
    detail: `Formatted as ${compact.slice(0, 2)}-${compact.slice(2, 4)}-${compact.slice(4)}.`,
  };
}

/** Australian BSB format check (6 digits, displayed xxx-xxx). */
export function checkBsbFormat(value: string): FormatCheck {
  const compact = value.replace(/[\s-]/g, "");
  if (!/^\d{6}$/.test(compact)) {
    return { valid: false, detail: "A BSB must be exactly 6 digits." };
  }
  return {
    valid: true,
    detail: `Formatted as ${compact.slice(0, 3)}-${compact.slice(3)}.`,
  };
}

/** Indian IFSC format check: 4-letter bank code, literal 0, 6 alphanumeric. */
export function checkIfscFormat(value: string): FormatCheck {
  const compact = value.replace(/\s/g, "").toUpperCase();
  if (!IFSC_RE.test(compact)) {
    return {
      valid: false,
      detail:
        "An IFSC is 11 characters: 4-letter bank code, then 0, then a 6-character branch code.",
    };
  }
  return {
    valid: true,
    detail: `${compact.slice(0, 4)} (bank) · ${compact.slice(4)} (branch).`,
  };
}

/** CNAPS code format check: 12 digits. */
export function checkCnapsFormat(value: string): FormatCheck {
  const compact = value.replace(/[\s-]/g, "");
  if (!/^\d{12}$/.test(compact)) {
    return { valid: false, detail: "A CNAPS code is exactly 12 digits." };
  }
  return {
    valid: true,
    detail: `Bank code ${compact.slice(0, 3)} · city/branch code ${compact.slice(3, 11)} · check digit ${compact.slice(11)}.`,
  };
}
