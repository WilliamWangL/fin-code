import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Version reported in the MCP handshake. Read from package.json so a release
 * only has to bump one place; the fallback keeps a source checkout usable even
 * if the manifest cannot be read.
 */
function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // src/ during development, dist/ once built — package.json sits one level up in both.
    const manifest = readFileSync(join(here, "..", "package.json"), "utf8");
    const parsed = JSON.parse(manifest) as { version?: string };
    return parsed.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export const VERSION = readVersion();
