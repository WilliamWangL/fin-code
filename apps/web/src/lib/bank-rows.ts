import type { BankSearchDoc } from "@/lib/banks-search";
import { countryByIso2, formatIdentifier, hrefForIdentifier, institutions } from "@/lib/data";
import { branchCountOf, type Institution } from "@/lib/data/types";

/** Directory row: searchable fields plus the pre-rendered display values. */
export interface BankRow extends BankSearchDoc {
  countryHref: string;
  identifiersCount: number;
  branchesCount: number;
  primaryIdentifierHref?: string;
}

/** Project an institution onto the row shape the directory renders. */
export function institutionToRow(institution: Institution): BankRow {
  const country = countryByIso2[institution.country];
  const primary =
    institution.identifiers.find((item) => item.type === "SWIFT") ??
    institution.identifiers[0];
  return {
    slug: institution.slug,
    nameEn: institution.nameEn,
    shortName: institution.shortName,
    legalName: institution.legalName,
    nameLocal: institution.nameLocal,
    countryName: country?.nameEn ?? institution.country,
    countryIso2: institution.country,
    countryHref: `/countries/${institution.country}`,
    identifiersCount: institution.identifiers.length,
    branchesCount: branchCountOf(institution),
    primaryIdentifier: primary ? formatIdentifier(primary.type, primary.value) : undefined,
    primaryIdentifierHref: primary
      ? hrefForIdentifier(primary.type, primary.value)
      : undefined,
  };
}

/** Every institution as a directory row; the search pool of /banks. */
export function allBankRows(): BankRow[] {
  return institutions.map(institutionToRow);
}
