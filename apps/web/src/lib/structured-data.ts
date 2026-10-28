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
