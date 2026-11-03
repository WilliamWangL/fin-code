import bsbNumber from "./bsb-number";
import bankIdentifierGuide from "./bank-identifier-guide";
import cnapsCode from "./cnaps-code";
import ifscCode from "./ifsc-code";
import routingNumber from "./routing-number";
import sortCode from "./sort-code";
import swiftBicCode from "./swift-bic-code";
import type { Guide, GuideBody, GuideLocale } from "./types";

/**
 * Editorial guides, hub first.
 *
 * Order matters: the index renders them in this sequence, so the overview that
 * links to every family sits at the top and takes the internal links.
 */
export const guides: Guide[] = [
  bankIdentifierGuide,
  swiftBicCode,
  ifscCode,
  sortCode,
  bsbNumber,
  routingNumber,
  cnapsCode,
];

export const guideSlugs: string[] = guides.map((guide) => guide.slug);

export function guideBySlug(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

/** Guide that explains one identifier family, for cross-linking from the tools. */
export function guideForFamily(family: string): Guide | undefined {
  return guides.find((guide) => guide.family === family && !guide.featured);
}

/** Body for the active locale; unknown locales fall back to English. */
export function guideBody(guide: Guide, locale: string): GuideBody {
  return guideLocale(locale) === "zh" ? guide.zh : guide.en;
}

export function guideLocale(locale: string): GuideLocale {
  return locale === "zh" ? "zh" : "en";
}

export type { Guide, GuideBody, GuideLocale } from "./types";
