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
    // Pipeline-imported records have no identifiers yet; date them with the
    // BSB dataset retrieval instead of omitting lastmod.
    const snapshotDate = institution.branchSnapshotKey
      ? sourceById["src-auspaynet"]?.retrievedAt
      : undefined;
    return {
      path: `/banks/${institution.slug}`,
      lastmod: dates.at(-1) ?? snapshotDate,
      changefreq: "monthly" as const,
      priority: 0.8,
    };
  });
  return xmlResponse(buildUrlset(entries));
}
