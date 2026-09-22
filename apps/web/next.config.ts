import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone output keeps the Docker runtime image small (FIN-032): only
  // server.js + traced node_modules + static assets are copied into it.
  output: "standalone",
};

export default withNextIntl(nextConfig);
