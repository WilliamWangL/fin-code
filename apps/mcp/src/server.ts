import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { FinCodeClient } from "./client.js";
import { VERSION } from "./version.js";
import { registerBankTools } from "./tools/banks.js";
import { registerIbanTools } from "./tools/iban.js";
import { registerIdentifierTools } from "./tools/identifiers.js";
import { registerReferenceTools } from "./tools/reference.js";

export const SERVER_NAME = "fincode";

/**
 * Server-level guidance handed to the model on initialize. Keep it short: tool
 * descriptions carry the per-tool detail, this only sets the vocabulary and the
 * rules that apply across tools.
 */
export const SERVER_INSTRUCTIONS = `FinCode is a global banking directory API. Each identifier family has its own lookup tool: lookup_swift_code, lookup_iban, lookup_ifsc, lookup_cnaps, lookup_routing_number, lookup_sort_code, lookup_bsb and lookup_bin. validate_iban only checks an IBAN's format and checksum.

How to use these tools:
- Pick the tool that matches the identifier family; each description states the expected shape and the issuing country.
- Six digits fit a UK/Ireland sort code, an Australian BSB and a card BIN. Use the user's country to pick lookup_sort_code, lookup_bsb or lookup_bin - do not try all three.
- validate_iban checks format and the MOD-97 checksum only; lookup_iban also resolves the issuing bank. A valid IBAN never proves an account exists - say so when reporting results.
- Institution-level questions: search_banks, then get_bank, then list_bank_branches. Reference data and IBAN layouts: list_countries and get_country.
- Keyless servers answer identifier lookups at 10 requests per minute per IP; directory tools fail with MISSING_API_KEY until FINCODE_API_KEY is configured.
- When an API call fails, quote error.code and meta.request_id to the user.`;

export function createServer(client: FinCodeClient): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, title: "FinCode bank data", version: VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );

  registerIdentifierTools(server, client);
  registerIbanTools(server, client);
  registerBankTools(server, client);
  registerReferenceTools(server, client);

  return server;
}
