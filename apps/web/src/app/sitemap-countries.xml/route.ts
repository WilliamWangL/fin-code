import { countries, sourceById } from "@/lib/data";
import { buildUrlset, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export const revalidate = 86400;

export function GET() {
  const ibanLastmod = sourceById["src-iban-registry"]?.retrievedAt;
  const entries = [
    ...countries.map((country) => ({
      path: `/countries/${country.iso2}`,
      changefreq: "monthly" as const,
      priority: 0.7,
    })),
    ...countries.map((country) => ({
      path: `/iban/${country.iso2}`,
      lastmod: ibanLastmod,
      changefreq: "monthly" as const,
      priority: 0.6,
    })),
  ];
  return xmlResponse(buildUrlset(entries));
}
