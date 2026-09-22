import { dataSources } from "@/lib/data/sources";
import { buildSitemapIndex, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export const revalidate = 86400;

export function GET() {
  const lastmod = dataSources.map((source) => source.retrievedAt).sort().at(-1);
  return xmlResponse(
    buildSitemapIndex(
      [
        "sitemap-pages.xml",
        "sitemap-banks.xml",
        "sitemap-countries.xml",
        "sitemap-swift.xml",
        "sitemap-routing.xml",
        "sitemap-sort-codes.xml",
        "sitemap-bsb.xml",
        "sitemap-ifsc.xml",
        "sitemap-cnaps.xml",
      ],
      lastmod,
    ),
  );
}
