import { docPages } from "@/lib/docs";
import { buildUrlset, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export const revalidate = 86400;

const STATIC_PATHS = [
  { path: "/", priority: 1.0, changefreq: "daily" as const },
  { path: "/iban-checker", priority: 0.9, changefreq: "weekly" as const },
  { path: "/swift-codes", priority: 0.9, changefreq: "weekly" as const },
  { path: "/routing-numbers", priority: 0.9, changefreq: "weekly" as const },
  { path: "/sort-codes", priority: 0.9, changefreq: "weekly" as const },
  { path: "/bsb", priority: 0.9, changefreq: "weekly" as const },
  { path: "/ifsc", priority: 0.9, changefreq: "weekly" as const },
  { path: "/cnaps", priority: 0.9, changefreq: "weekly" as const },
  { path: "/banks", priority: 0.8, changefreq: "weekly" as const },
  { path: "/countries", priority: 0.8, changefreq: "weekly" as const },
  { path: "/pricing", priority: 0.7, changefreq: "monthly" as const },
  { path: "/developers", priority: 0.8, changefreq: "weekly" as const },
  { path: "/docs", priority: 0.8, changefreq: "weekly" as const },
  { path: "/about", priority: 0.5, changefreq: "yearly" as const },
  { path: "/contact", priority: 0.5, changefreq: "yearly" as const },
  { path: "/status", priority: 0.5, changefreq: "daily" as const },
  { path: "/privacy", priority: 0.3, changefreq: "yearly" as const },
  { path: "/terms", priority: 0.3, changefreq: "yearly" as const },
];

export function GET() {
  const entries = [
    ...STATIC_PATHS,
    // API documentation (api-reference and any future api-* page) stays out
    // of the sitemap.
    ...docPages
      .filter((page) => !page.slug.startsWith("api"))
      .map((page) => ({
        path: `/docs/${page.slug}`,
        priority: 0.6,
        changefreq: "monthly" as const,
      })),
  ];
  return xmlResponse(buildUrlset(entries));
}
