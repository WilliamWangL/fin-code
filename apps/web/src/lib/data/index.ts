import { institutions, institutionBySlug } from "./banks";
import { countries, countryByIso2 } from "./countries";
import { ibanFormats, ibanFormatByCountry } from "./iban-formats";
import { sourceById, dataSources } from "./sources";
import type {
  Country,
  Identifier,
  IdentifierType,
  Institution,
} from "./types";
import { detectIdentifierType, normalizeIdentifier } from "@/lib/identifiers";

export interface IdentifierEntry {
  identifier: Identifier;
  institution: Institution;
}

export interface SearchResult {
  kind: "identifier" | "bank" | "branch" | "country";
  title: string;
  subtitle?: string;
  value?: string;
  identifierType?: IdentifierType | "IBAN";
  href: string;
}

// ── Identifier index ────────────────────────────────────────────────────────

const identifierEntries: IdentifierEntry[] = institutions.flatMap((institution) =>
  institution.identifiers.map((identifier) => ({ identifier, institution })),
);

const identifierIndex = new Map<string, IdentifierEntry>();
for (const entry of identifierEntries) {
  identifierIndex.set(`${entry.identifier.type}:${entry.identifier.value}`, entry);
}

export function getIdentifier(
  type: IdentifierType,
  value: string,
): IdentifierEntry | undefined {
  return identifierIndex.get(`${type}:${normalizeIdentifier(type, value)}`);
}

export function listIdentifiers(type: IdentifierType): IdentifierEntry[] {
  return identifierEntries.filter((entry) => entry.identifier.type === type);
}

export function listIdentifiersByCountry(
  type: IdentifierType,
  country: string,
): IdentifierEntry[] {
  return identifierEntries.filter(
    (entry) =>
      entry.identifier.type === type && entry.institution.country === country,
  );
}

export function hrefForIdentifier(
  type: IdentifierType | "IBAN",
  value: string,
  country?: string,
): string {
  switch (type) {
    case "SWIFT":
    case "BIC":
      return `/swift-codes/${value}`;
    case "ABA_ROUTING":
      return `/routing-numbers/${value}`;
    case "SORT_CODE":
      return `/sort-codes/${formatIdentifier(type, value)}`;
    case "BSB":
      return `/bsb/${formatIdentifier(type, value)}`;
    case "IFSC":
      return `/ifsc/${value}`;
    case "CNAPS":
      return `/cnaps/${value}`;
    case "IBAN":
      return `/iban/${country ?? value.slice(0, 2)}`;
    default:
      return "/banks";
  }
}

/** Pretty display value (adds conventional separators). */
export function formatIdentifier(type: IdentifierType | "IBAN", value: string): string {
  switch (type) {
    case "SORT_CODE":
      return `${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4)}`;
    case "BSB":
      return `${value.slice(0, 3)}-${value.slice(3)}`;
    case "IBAN":
      return value.replace(/(.{4})/g, "$1 ").trim();
    default:
      return value;
  }
}

// ── Institutions & countries ────────────────────────────────────────────────

export {
  institutions,
  institutionBySlug,
  countries,
  countryByIso2,
  ibanFormats,
  ibanFormatByCountry,
  dataSources,
  sourceById,
};

export type { Country, Institution, Identifier, IdentifierType };

// ── Universal search ────────────────────────────────────────────────────────

const MAX_RESULTS = 20;

export function searchAll(query: string): SearchResult[] {
  const raw = query.trim();
  if (!raw) return [];

  const normalized = normalizeIdentifier("SWIFT", raw);
  const lower = raw.toLowerCase();
  const results: SearchResult[] = [];

  // 1. Exact identifier matches (strongest signal).
  for (const [key, entry] of identifierIndex) {
    const value = normalizeIdentifier(entry.identifier.type, raw);
    if (value && key === `${entry.identifier.type}:${value}`) {
      results.push({
        kind: "identifier",
        title: formatIdentifier(entry.identifier.type, entry.identifier.value),
        subtitle: entry.institution.nameEn,
        value: entry.identifier.value,
        identifierType: entry.identifier.type,
        href: hrefForIdentifier(entry.identifier.type, entry.identifier.value),
      });
    }
  }

  // 2. Prefix matches on identifier values.
  if (normalized.length >= 2) {
    for (const entry of identifierEntries) {
      if (entry.identifier.value.startsWith(normalized)) {
        const already = results.some((result) => result.value === entry.identifier.value);
        if (!already) {
          results.push({
            kind: "identifier",
            title: formatIdentifier(entry.identifier.type, entry.identifier.value),
            subtitle: entry.institution.nameEn,
            value: entry.identifier.value,
            identifierType: entry.identifier.type,
            href: hrefForIdentifier(entry.identifier.type, entry.identifier.value),
          });
        }
      }
    }
  }

  // 3. Institution name matches (English, local, short name).
  for (const institution of institutions) {
    const haystacks = [
      institution.nameEn,
      institution.nameLocal ?? "",
      institution.shortName,
      institution.legalName,
    ];
    if (haystacks.some((name) => name.toLowerCase().includes(lower))) {
      results.push({
        kind: "bank",
        title: institution.nameEn,
        subtitle: institution.shortName,
        value: institution.slug,
        href: `/banks/${institution.slug}`,
      });
    }
  }

  // 4. Country matches.
  for (const country of countries) {
    if (
      country.nameEn.toLowerCase().includes(lower) ||
      country.nameLocal.includes(raw) ||
      country.iso2 === raw.toUpperCase() ||
      country.iso3 === raw.toUpperCase()
    ) {
      results.push({
        kind: "country",
        title: country.nameEn,
        subtitle: country.nameLocal,
        value: country.iso2,
        href: `/countries/${country.iso2}`,
      });
    }
  }

  // 5. Branch matches (city / branch name).
  for (const institution of institutions) {
    for (const branch of institution.branches) {
      if (
        branch.name.toLowerCase().includes(lower) ||
        branch.city.toLowerCase().includes(lower)
      ) {
        results.push({
          kind: "branch",
          title: `${institution.shortName} — ${branch.name}`,
          subtitle: branch.city,
          value: institution.slug,
          href: `/banks/${institution.slug}`,
        });
      }
    }
  }

  return results.slice(0, MAX_RESULTS);
}

export function datasetStats() {
  return {
    identifiers: identifierEntries.length,
    institutions: institutions.length,
    countries: countries.length,
    ibanCountries: ibanFormats.length,
  };
}

export { detectIdentifierType };
