import type { BreadcrumbItem } from "@/components/breadcrumb";
import { siteConfig } from "@/lib/site";

export type BreadcrumbListJsonLd = {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  }>;
};

export type FaqPageJsonLd = {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
};

export type ArticleJsonLd = {
  "@context": "https://schema.org";
  "@type": "TechArticle";
  headline: string;
  description: string;
  inLanguage: string;
  dateModified: string;
  mainEntityOfPage: string;
  isPartOf: { "@type": "WebSite"; name: string; url: string };
};

/** TechArticle markup for the editorial guides. */
export function articleJsonLd({
  headline,
  description,
  locale,
  path,
  dateModified,
}: {
  headline: string;
  description: string;
  locale: string;
  /** Locale-relative path, e.g. "/guides/swift-bic-code". */
  path: string;
  dateModified: string;
}): ArticleJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline,
    description,
    inLanguage: locale,
    dateModified,
    mainEntityOfPage: `${siteConfig.url}/${locale}${path}`,
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
  };
}

/**
 * FAQPage structured data for the Q&A block rendered on detail pages.
 * Blank entries are dropped: an empty Question is invalid and would take the
 * whole block out of the rich result.
 */
export function faqPageJsonLd(
  items: ReadonlyArray<{ question: string; answer: string }>,
): FaqPageJsonLd {
  const mainEntity = items
    .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0)
    .map((item) => ({
      "@type": "Question" as const,
      name: item.question,
      acceptedAnswer: { "@type": "Answer" as const, text: item.answer },
    }));

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

/**
 * BreadcrumbList structured data for a page.
 *
 * Google rejects a ListItem that carries neither `name` nor `item.name`
 * ("应指定 name 或 item.name"), and directory rows can surface a blank
 * display name. Labels are therefore trimmed and blank ones dropped, with
 * positions renumbered so the list stays contiguous.
 */
export function breadcrumbListJsonLd(
  items: readonly BreadcrumbItem[],
  locale: string,
): BreadcrumbListJsonLd {
  const listItems = items
    .map((item) => ({ href: item.href, label: item.label.trim() }))
    .filter((item) => item.label.length > 0)
    .map((item, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: item.label,
      ...(item.href
        ? { item: `${siteConfig.url}/${locale}${item.href === "/" ? "" : item.href}` }
        : {}),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: listItems,
  };
}
