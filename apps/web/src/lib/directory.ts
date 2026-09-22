import type { IdentifierType } from "@/lib/data/types";
import {
  countryByIso2,
  formatIdentifier,
  hrefForIdentifier,
  listIdentifiers,
} from "@/lib/data";
import type { IdentifierRow, CountryOption } from "@/components/identifier-directory";

/**
 * Translated label for an identifier type, resolved through
 * `common.identifierTypes.*`. `t` must be bound to the "common" namespace.
 */
export function identifierTypeLabel(
  t: (key: string) => string,
  type: IdentifierType | "IBAN",
): string {
  return t(`identifierTypes.${type}`);
}

export interface IdentifierTypeConfig {
  type: IdentifierType;
  /** Locale route base, e.g. "/swift-codes". */
  basePath: string;
  /** Message namespace under `tool`, e.g. "swift". */
  messageNamespace: string;
  /** URL param name used by the dynamic route. */
  paramKey: string;
}

export const identifierTypeConfigs: Record<
  "SWIFT" | "ABA_ROUTING" | "SORT_CODE" | "BSB" | "IFSC" | "CNAPS",
  IdentifierTypeConfig
> = {
  SWIFT: { type: "SWIFT", basePath: "/swift-codes", messageNamespace: "swift", paramKey: "code" },
  ABA_ROUTING: { type: "ABA_ROUTING", basePath: "/routing-numbers", messageNamespace: "routing", paramKey: "number" },
  SORT_CODE: { type: "SORT_CODE", basePath: "/sort-codes", messageNamespace: "sortCode", paramKey: "code" },
  BSB: { type: "BSB", basePath: "/bsb", messageNamespace: "bsb", paramKey: "code" },
  IFSC: { type: "IFSC", basePath: "/ifsc", messageNamespace: "ifsc", paramKey: "code" },
  CNAPS: { type: "CNAPS", basePath: "/cnaps", messageNamespace: "cnaps", paramKey: "code" },
};

/** Build the client-side directory rows for one identifier type. */
export function buildDirectoryRows(type: IdentifierType) {
  const rows: IdentifierRow[] = listIdentifiers(type).map(({ identifier, institution }) => {
    const country = countryByIso2[institution.country];
    return {
      displayValue: formatIdentifier(identifier.type, identifier.value),
      href: hrefForIdentifier(identifier.type, identifier.value),
      institutionName: institution.nameEn,
      institutionHref: `/banks/${institution.slug}`,
      countryName: country?.nameEn ?? institution.country,
      countryIso2: institution.country,
      countryHref: `/countries/${institution.country}`,
      city: identifier.city,
      verified: identifier.verified,
    };
  });

  const countryOptions: CountryOption[] = Array.from(
    new Set(rows.map((row) => row.countryIso2)),
  )
    .map((iso2) => ({ iso2, name: countryByIso2[iso2]?.nameEn ?? iso2 }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { rows, countries: countryOptions };
}
