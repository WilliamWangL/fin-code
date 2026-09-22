/**
 * Core data model for the FinCode website preview dataset.
 *
 * All records mirror the production domain model
 * (FinancialInstitution / BankIdentifier / Country / IBANCountryFormat /
 * DataSource) defined in the development specification, so the website can
 * later switch to the live V1 API without changing page contracts.
 */

export type IdentifierType =
  | "SWIFT"
  | "BIC"
  | "ABA_ROUTING"
  | "SORT_CODE"
  | "BSB"
  | "IFSC"
  | "CNAPS"
  | "BANK_CODE"
  | "CLEARING_CODE"
  | "TRANSIT_NUMBER"
  | "INSTITUTION_CODE";

export type SourceType = "OFFICIAL" | "PUBLIC" | "BANK" | "COMMUNITY";

export type InstitutionType = "BANK" | "CENTRAL_BANK";

export interface DataSource {
  id: string;
  name: string;
  sourceType: SourceType;
  provider: string;
  url?: string;
  license?: string;
  /** ISO date (yyyy-MM-dd) when the dataset snapshot was retrieved. */
  retrievedAt: string;
}

export interface Identifier {
  type: IdentifierType;
  /** Canonical, compact value (no separators, uppercase). */
  value: string;
  /** City attached to the code (e.g. SWIFT location city). */
  city?: string;
  /** Human label, e.g. "Head Office". */
  label?: string;
  sourceId: string;
  verified: boolean;
}

export interface Branch {
  slug: string;
  name: string;
  nameLocal?: string;
  city: string;
  address?: string;
}

export interface Institution {
  slug: string;
  legalName: string;
  nameEn: string;
  nameLocal?: string;
  shortName: string;
  country: string;
  institutionType: InstitutionType;
  website: string;
  identifiers: Identifier[];
  branches: Branch[];
}

export interface Country {
  iso2: string;
  iso3: string;
  numeric: string;
  nameEn: string;
  nameLocal: string;
  currency: string;
  iban: { supported: boolean; length?: number };
  localIdentifierType?: IdentifierType;
}

/** 1-based start position and length within the full IBAN string. */
export interface Segment {
  start: number;
  length: number;
}

export interface IbanFormat {
  countryCode: string;
  length: number;
  /** Human readable structure, e.g. "DEkk BBBB BBBB BBBB BBBB BB". */
  structure: string;
  bankCode?: Segment;
  branchCode?: Segment;
  accountNumber?: Segment;
  nationalCheck?: Segment;
  /** Official registry example (checksum valid). */
  example?: string;
}
