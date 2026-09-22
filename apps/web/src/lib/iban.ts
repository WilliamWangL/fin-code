import { ibanFormatByCountry } from "@/lib/data/iban-formats";
import type { Segment } from "@/lib/data/types";

export interface IbanCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface IbanValidation {
  input: string;
  normalized: string;
  valid: boolean;
  checks: IbanCheck[];
  parsed?: {
    countryCode: string;
    checkDigits: string;
    bankCode?: string;
    branchCode?: string;
    accountNumber?: string;
    nationalCheck?: string;
    length: number;
    expectedLength?: number;
  };
}

/** Normalize user input: remove spaces/dashes, uppercase. */
export function normalizeIban(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/** MOD-97 checksum per ISO 7064 (used by IBAN). */
export function ibanMod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    let value: number;
    if (code >= 48 && code <= 57) {
      value = code - 48;
      remainder = (remainder * 10 + value) % 97;
    } else if (code >= 65 && code <= 90) {
      value = code - 55; // A = 10 ... Z = 35
      remainder = (remainder * 100 + value) % 97;
    } else {
      return -1;
    }
  }
  return remainder;
}

function sliceSegment(iban: string, segment: Segment): string {
  return iban.slice(segment.start - 1, segment.start - 1 + segment.length);
}

/**
 * Validate an IBAN: normalization, country support, length, character set,
 * MOD-97 checksum, and (where defined) the country BBAN structure, then
 * extract the embedded bank / branch / account components.
 *
 * A format-valid IBAN does NOT prove that the account exists.
 */
export function validateIban(input: string): IbanValidation {
  const normalized = normalizeIban(input);
  const checks: IbanCheck[] = [];

  // 1. Character set
  const charsetOk = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(normalized);
  checks.push({
    id: "charset",
    label: "Character set",
    passed: normalized.length >= 4 ? /^[A-Z0-9]+$/.test(normalized) : false,
    detail: /^[A-Z0-9]+$/.test(normalized)
      ? "Only alphanumeric characters (A–Z, 0–9)"
      : "Contains invalid characters — only A–Z and 0–9 are allowed",
  });

  if (!charsetOk && normalized.length < 15) {
    return {
      input,
      normalized,
      valid: false,
      checks: checks.filter((check) => check.id === "charset"),
    };
  }

  const countryCode = normalized.slice(0, 2);
  const checkDigits = normalized.slice(2, 4);
  const format = ibanFormatByCountry[countryCode];

  // 2. Country support
  checks.push({
    id: "country",
    label: "Country code",
    passed: Boolean(format),
    detail: format
      ? `${countryCode} participates in IBAN (ISO 13616)`
      : `${countryCode || "—"} is not a known IBAN country`,
  });

  // 3. Length
  const expectedLength = format?.length;
  const lengthOk = expectedLength === undefined ? false : normalized.length === expectedLength;
  checks.push({
    id: "length",
    label: "Length",
    passed: lengthOk,
    detail: expectedLength
      ? `${normalized.length} characters (expected ${expectedLength} for ${countryCode})`
      : "Length cannot be checked for an unknown country",
  });

  // 4. MOD-97 checksum
  const mod97 = ibanMod97(normalized);
  const checksumOk = mod97 === 1;
  checks.push({
    id: "checksum",
    label: "Checksum (MOD-97)",
    passed: checksumOk,
    detail: checksumOk
      ? "Check digits are valid"
      : mod97 >= 0
        ? "Check digits are invalid"
        : "Checksum cannot be computed (invalid characters)",
  });

  // 5. Country structure (when a BBAN layout is published)
  const structureOk = format ? charsetOk && lengthOk : false;
  checks.push({
    id: "structure",
    label: "BBAN structure",
    passed: Boolean(format) && structureOk,
    detail: format
      ? structureOk
        ? `Matches the ${countryCode} structure ${format.structure}`
        : `Cannot be matched against ${countryCode} structure ${format.structure} (length/charset failed)`
      : "No published structure for this country",
  });

  const valid = charsetOk && Boolean(format) && lengthOk && checksumOk;

  const parsed = format
    ? {
        countryCode,
        checkDigits,
        bankCode: format.bankCode ? sliceSegment(normalized, format.bankCode) : undefined,
        branchCode: format.branchCode ? sliceSegment(normalized, format.branchCode) : undefined,
        accountNumber: format.accountNumber
          ? sliceSegment(normalized, format.accountNumber)
          : undefined,
        nationalCheck: format.nationalCheck
          ? sliceSegment(normalized, format.nationalCheck)
          : undefined,
        length: normalized.length,
        expectedLength,
      }
    : undefined;

  return { input, normalized, valid, checks, parsed };
}
