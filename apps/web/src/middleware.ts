import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - /api routes
  // - /_next internals
  // - files with an extension (e.g. sitemap.xml, robots.txt, favicon.ico)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
