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

/**
 * Guides to offer at the end of `guide`, most relevant first.
 *
 * Order comes from the guide's own `related` list rather than the declaration
 * order of `guides`: a reader finishing the IFSC page needs the Chinese and
 * cross-border codes, not whichever guide happens to sit next in the array.
 * Unknown or self-referencing slugs are dropped, and the remaining slots are
 * filled from declaration order so the block is never short.
 */
export function relatedGuides(guide: Guide, limit = 3): Guide[] {
  const picked = (guide.related ?? [])
    .map((slug) => guideBySlug(slug))
    .filter(
      (candidate): candidate is Guide =>
        candidate !== undefined && candidate.slug !== guide.slug,
    );

  const fill = guides.filter(
    (candidate) =>
      candidate.slug !== guide.slug &&
      !picked.some((pickedGuide) => pickedGuide.slug === candidate.slug),
  );

  return [...picked, ...fill].slice(0, limit);
}

/** Body for the active locale; unknown locales fall back to English. */
export function guideBody(guide: Guide, locale: string): GuideBody {
  return guideLocale(locale) === "zh" ? guide.zh : guide.en;
}

export function guideLocale(locale: string): GuideLocale {
  return locale === "zh" ? "zh" : "en";
}

export type { Guide, GuideBody, GuideLocale } from "./types";
