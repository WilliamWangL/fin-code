import { hrefForIdentifier, listIdentifiers } from "@/lib/data";
import { sourceById } from "@/lib/data/sources";
import { buildUrlset, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export const revalidate = 86400;

export function GET() {
  const entries = listIdentifiers("IFSC").map(({ identifier }) => ({
    path: hrefForIdentifier(identifier.type, identifier.value),
    lastmod: sourceById[identifier.sourceId]?.retrievedAt,
    changefreq: "monthly" as const,
    priority: 0.7,
  }));
  return xmlResponse(buildUrlset(entries));
}
