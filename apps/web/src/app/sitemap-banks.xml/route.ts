import { institutions } from "@/lib/data";
import { sourceById } from "@/lib/data/sources";
import { buildUrlset, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export const revalidate = 86400;

export function GET() {
  const entries = institutions.map((institution) => {
    const dates = institution.identifiers
      .map((identifier) => sourceById[identifier.sourceId]?.retrievedAt)
      .filter((date): date is string => date !== undefined)
      .sort();
    return {
      path: `/banks/${institution.slug}`,
      lastmod: dates.at(-1),
      changefreq: "monthly" as const,
      priority: 0.8,
    };
  });
  return xmlResponse(buildUrlset(entries));
}
