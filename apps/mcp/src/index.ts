#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { FinCodeClient } from "./client.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";
import { VERSION } from "./version.js";

// stdio carries the MCP protocol on stdout: a stray console.log corrupts the
// session, so route anything that would print to stdout over to stderr instead.
for (const level of ["log", "info", "debug"] as const) {
  console[level] = (...args: unknown[]) => console.error(...args);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new FinCodeClient(config);
  const server = createServer(client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    `fincode-mcp ${VERSION} ready — ${config.baseUrl} (${client.authenticated ? "authenticated" : "keyless: identifier lookups only"})`,
  );

  const shutdown = () => {
    void server.close().finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error("fincode-mcp failed to start:", error instanceof Error ? error.message : error);
  process.exit(1);
});
