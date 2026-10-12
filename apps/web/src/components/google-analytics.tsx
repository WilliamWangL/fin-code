import Script from "next/script";

import { siteConfig } from "@/lib/site";

/**
 * Loads the Google Analytics (gtag.js) web tag after hydration.
 * The measurement id lives in siteConfig; nothing renders without it.
 */
export function GoogleAnalytics() {
  const id = siteConfig.googleAnalyticsId;
  if (!id) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
