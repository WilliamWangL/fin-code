import type { DataSource } from "./types";

/**
 * Every identifier rendered on the website is attributed to one of these
 * sources (spec: "All core data must have a source").
 */
export const dataSources: DataSource[] = [
  {
    id: "src-swift-bic",
    name: "SWIFT BIC Directory (ISO 9362)",
    sourceType: "PUBLIC",
    provider: "SWIFT SCRL",
    url: "https://www.swift.com/standards/data-standards/bic",
    license: "Referenced for identification purposes",
    retrievedAt: "2026-08-15",
  },
  {
    id: "src-iban-registry",
    name: "ISO 13616 IBAN Registry",
    sourceType: "OFFICIAL",
    provider: "SWIFT SCRL (ISO registrar)",
    url: "https://www.swift.com/standards/data-standards/iban",
    license: "Public registry data",
    retrievedAt: "2026-08-15",
  },
  {
    id: "src-aba-registrar",
    name: "ABA Routing Number Registrar",
    sourceType: "OFFICIAL",
    provider: "Accuity (ABA registrar)",
    url: "https://www.frbservices.org/financial-services/aba-registrars",
    license: "Public registrar data",
    retrievedAt: "2026-08-15",
  },
  {
    id: "src-pay-uk",
    name: "UK Sort Code Directory",
    sourceType: "OFFICIAL",
    provider: "Pay.UK",
    url: "https://www.pay.uk",
    license: "Public directory data",
    retrievedAt: "2026-08-15",
  },
  {
    id: "src-auspaynet",
    name: "BSB Directory",
    sourceType: "OFFICIAL",
    provider: "Australian Payments Network",
    url: "https://www.auspaynet.com.au",
    license: "Public directory data",
    retrievedAt: "2026-08-15",
  },
  {
    id: "src-rbi-ifsc",
    name: "IFSC Master Directory",
    sourceType: "OFFICIAL",
    provider: "Reserve Bank of India",
    url: "https://www.rbi.org.in",
    license: "Public master directory",
    retrievedAt: "2026-08-15",
  },
  {
    id: "src-pboc-cnaps",
    name: "CNAPS Participant Codes",
    sourceType: "OFFICIAL",
    provider: "People's Bank of China",
    url: "http://www.pbc.gov.cn",
    license: "Published participant lists",
    retrievedAt: "2026-08-15",
  },
  {
    id: "src-bank-website",
    name: "Institution official website",
    sourceType: "BANK",
    provider: "Financial institutions",
    license: "Publicly published information",
    retrievedAt: "2026-08-15",
  },
];

export const sourceById: Record<string, DataSource> = Object.fromEntries(
  dataSources.map((source) => [source.id, source]),
);
