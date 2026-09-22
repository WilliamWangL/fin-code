export const siteConfig = {
  name: "FinCode",
  tagline: "Global Financial Data API",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://fincode.example.com",
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.fincode.example.com/v1",
  // Public PayPal client id for the checkout buttons (FIN-019); billing stays
  // hidden in the portal when it is not set.
  paypalClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
  locales: ["en", "zh"] as const,
  defaultLocale: "en",
} as const;

/**
 * Build locale-aware alternates (hreflang + canonical) for a page path.
 * `path` is the un-prefixed route, e.g. "/swift-codes/ICBKCNBJ".
 */
export function alternatesFor(locale: string, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return {
    canonical: `/${locale}${clean === "/" ? "" : clean}`,
    languages: {
      en: `/en${clean === "/" ? "" : clean}`,
      zh: `/zh${clean === "/" ? "" : clean}`,
      "x-default": `/en${clean === "/" ? "" : clean}`,
    } as Record<string, string>,
  };
}
