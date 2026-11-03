import { institutions } from "@/lib/data";
import { sourceById } from "@/lib/data/sources";
import { buildUrlset, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export const revalidate = 86400;

export function GET() {
  // CNAPS-imported records use their Chinese name as slug and are marked
  // noindex on the page itself; listing them here would only invite a crawl
  // that cannot end in an indexed URL.
  const indexable = institutions.filter((institution) =>
    /^[A-Za-z0-9._~-]+$/.test(institution.slug),
  );

  const entries = indexable.map((institution) => {
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
      // Sitemap spec requires URLs to be escaped; CJK slugs must be
      // percent-encoded in <loc>.
      path: `/banks/${encodeURIComponent(institution.slug)}`,
      lastmod: dates.at(-1) ?? snapshotDate,
      changefreq: "monthly" as const,
      priority: 0.8,
    };
  });
  return xmlResponse(buildUrlset(entries));
}
