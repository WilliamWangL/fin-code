import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

const XHTML_NS = "http://www.w3.org/1999/xhtml";

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

export interface SitemapEntry {
  /** Locale-independent path, e.g. "/swift-codes/ICBKCNBJ". */
  path: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
}

function localeUrl(locale: string, path: string): string {
  const clean = path === "/" ? "" : path;
  return `${siteConfig.url}/${locale}${clean}`;
}

/**
 * Build a urlset with hreflang alternates: every entry is emitted once per
 * locale, each carrying xhtml:link alternates for all locales plus
 * x-default.
 */
export function buildUrlset(entries: SitemapEntry[]): string {
  const urls = entries.flatMap((entry) =>
    routing.locales.map((locale) => {
      const alternates = [
        ...routing.locales.map((alt) => ({
          hreflang: alt,
          href: localeUrl(alt, entry.path),
        })),
        { hreflang: "x-default", href: localeUrl(routing.defaultLocale, entry.path) },
      ];
      const extras = [
        entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : "",
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : "",
        entry.priority !== undefined ? `    <priority>${entry.priority}</priority>` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return `  <url>
    <loc>${escapeXml(localeUrl(locale, entry.path))}</loc>
${alternates
  .map(
    (alt) =>
      `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}"/>`,
  )
  .join("\n")}
${extras}
  </url>`;
    }),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="${XHTML_NS}">
${urls.join("\n")}
</urlset>
`;
}

/** Build a sitemap index pointing at child sitemap files. */
export function buildSitemapIndex(sitemaps: string[], lastmod?: string): string {
  const items = sitemaps.map(
    (name) => `  <sitemap>
    <loc>${escapeXml(`${siteConfig.url}/${name}`)}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}  </sitemap>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.join("\n")}
</sitemapindex>
`;
}

/** Response helper for XML route handlers. */
export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
