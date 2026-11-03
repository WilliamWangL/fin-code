import type { IdentifierType } from "@/lib/data/types";

/**
 * Positional breakdown of an identifier.
 *
 * The detail pages used to show a one-line format note; a table that explains
 * every segment (and what it means for *this* code) is the difference between
 * a thin data row and a page worth indexing. Keys resolve against the
 * "breakdown" message namespace so both locales stay in sync.
 */
export interface BreakdownSegment {
  /** The slice of the code this row explains. */
  value: string;
  /** Label key under `breakdown.labels.*`. */
  labelKey: string;
  /** Explanation key under `breakdown.hints.*`. */
  hintKey: string;
}

export interface Breakdown {
  segments: BreakdownSegment[];
  /** Spec key under `breakdown.standards.*`. */
  standardKey: string;
  /** Character map of the structure, e.g. "AAAA CC LL [BBB]". */
  mask: string;
}

const compact = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();

/** Structural breakdown for a known identifier type; null for other types. */
export function breakdownFor(type: IdentifierType, rawValue: string): Breakdown | null {
  const value = compact(rawValue);

  switch (type) {
    case "SWIFT":
    case "BIC": {
      const branch = value.length === 11 ? value.slice(8, 11) : "";
      return {
        standardKey: "swift",
        mask: "AAAA CC LL [BBB]",
        segments: [
          { value: value.slice(0, 4), labelKey: "bank", hintKey: "swiftBank" },
          { value: value.slice(4, 6), labelKey: "country", hintKey: "swiftCountry" },
          { value: value.slice(6, 8), labelKey: "location", hintKey: "swiftLocation" },
          ...(branch
            ? [{ value: branch, labelKey: "branch", hintKey: "swiftBranch" }]
            : []),
        ],
      };
    }
    case "IFSC":
      return {
        standardKey: "ifsc",
        mask: "AAAA 0 AAAAAA",
        segments: [
          { value: value.slice(0, 4), labelKey: "bank", hintKey: "ifscBank" },
          { value: value.slice(4, 5), labelKey: "reserved", hintKey: "ifscZero" },
          { value: value.slice(5, 11), labelKey: "branch", hintKey: "ifscBranch" },
        ],
      };
    case "BSB":
      return {
        standardKey: "bsb",
        mask: "BB S BBB",
        segments: [
          { value: value.slice(0, 2), labelKey: "bank", hintKey: "bsbBank" },
          { value: value.slice(2, 3), labelKey: "region", hintKey: "bsbState" },
          { value: value.slice(3, 6), labelKey: "branch", hintKey: "bsbBranch" },
        ],
      };
    case "SORT_CODE":
      return {
        standardKey: "sort",
        mask: "BB LL BB",
        segments: [
          { value: value.slice(0, 2), labelKey: "bank", hintKey: "sortBank" },
          { value: value.slice(2, 4), labelKey: "location", hintKey: "sortLocation" },
          { value: value.slice(4, 6), labelKey: "branch", hintKey: "sortBranch" },
        ],
      };
    case "ABA_ROUTING":
      return {
        standardKey: "aba",
        mask: "DD IIIIII C",
        segments: [
          { value: value.slice(0, 2), labelKey: "region", hintKey: "abaDistrict" },
          { value: value.slice(2, 8), labelKey: "bank", hintKey: "abaInstitution" },
          { value: value.slice(8, 9), labelKey: "check", hintKey: "abaCheck" },
        ],
      };
    case "CNAPS":
      return {
        standardKey: "cnaps",
        mask: "BBB RRRR BBBB C",
        segments: [
          { value: value.slice(0, 3), labelKey: "bank", hintKey: "cnapsBank" },
          { value: value.slice(3, 7), labelKey: "region", hintKey: "cnapsRegion" },
          { value: value.slice(7, 11), labelKey: "branch", hintKey: "cnapsBranch" },
          { value: value.slice(11, 12), labelKey: "check", hintKey: "cnapsCheck" },
        ],
      };
    default:
      return null;
  }
}
