import { dataSources } from "@/lib/data/sources";
import { buildSitemapIndex, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export const revalidate = 86400;

/**
 * Child sitemaps exposed in the index, in crawl-priority order.
 *
 * `sitemap-banks.xml` is deliberately held back: it carries ~8,300 URLs (93% of
 * the whole inventory) while the domain still has no backlink profile, so the
 * daily crawl budget gets spread thin and the pages that actually matter stay
 * uncrawled. The file remains served at /sitemap-banks.xml; re-add it here once
 * the smaller sitemaps are indexed.
 */
const INDEXED_SITEMAPS = [
  "sitemap-pages.xml",
  "sitemap-countries.xml",
  "sitemap-swift.xml",
  "sitemap-routing.xml",
  "sitemap-sort-codes.xml",
  "sitemap-bsb.xml",
  "sitemap-ifsc.xml",
  "sitemap-cnaps.xml",
];

export function GET() {
  const lastmod = dataSources.map((source) => source.retrievedAt).sort().at(-1);
  return xmlResponse(buildSitemapIndex(INDEXED_SITEMAPS, lastmod));
}
