import type { IdentifierType } from "@/lib/data/types";

/**
 * Editorial guides under /guides.
 *
 * These are the only pages on the site that are written rather than generated.
 * Their job is not to repeat the directory data but to answer the question a
 * searcher actually types ("what is an IFSC code", "where do I find my sort
 * code") and then hand them off to the matching lookup tool, which is what the
 * directory pages can never do on their own.
 */

export interface GuideSection {
  /** Anchor id, used by the table of contents. */
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideBody {
  title: string;
  description: string;
  /** Standfirst, rendered above the first section. */
  intro: string[];
  sections: GuideSection[];
  faq: GuideFaq[];
}

export interface Guide {
  slug: string;
  /** Identifier family the guide explains; drives the call-to-action link. */
  family?: IdentifierType;
  /** Hub page rendered first on the index. */
  featured?: boolean;
  /** ISO date of the last editorial review, shown to readers. */
  reviewed: string;
  /**
   * Slugs of the guides to offer at the end of this one, most relevant first.
   * Picked by hand because neighbouring families are not interchangeable.
   */
  related?: string[];
  en: GuideBody;
  zh: GuideBody;
}

export type GuideLocale = "en" | "zh";
