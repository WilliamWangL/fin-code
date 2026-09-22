import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/en/search",
          "/zh/search",
          "/en/login",
          "/zh/login",
          "/en/register",
          "/zh/register",
          "/en/dashboard",
          "/zh/dashboard",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
