import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { FinCodeClient } from "../client.js";
import { FinCodeApiError } from "../errors.js";
import { normalizeIdentifier } from "../normalize.js";
import { failure, invalidIdentifier, jsonResult, notFound, withMeta } from "./shared.js";

/**
 * One tool per identifier family, mirroring the typed endpoints 1:1. Separate
 * tools keep each schema narrow — the model sees the expected shape for a
 * SWIFT code or an IFSC in the tool description and picks the right one,
 * instead of routing an opaque value through a detector first.
 */
interface CodeToolDefinition {
  name: string;
  title: string;
  description: string;
  /** Value reported back in the result, matching the API's identifier naming. */
  type: string;
  /** API path segment, e.g. `sort-code` for GET /v1/sort-code/{code}. */
  segment: string;
  /** Parameter name exposed in the tool's input schema. */
  param: string;
  paramDescription: string;
  /** Human label used in not-found and invalid-value payloads. */
  label: string;
}

const CODE_TOOLS: CodeToolDefinition[] = [
  {
    name: "lookup_swift_code",
    title: "Look up a SWIFT/BIC code",
    description:
      "Resolve an 8 or 11 character SWIFT/BIC code to its institution: legal name, city, country and data provenance. The format block splits the code into institution, country, location and branch parts. Works without an API key.",
    type: "SWIFT",
    segment: "swift",
    param: "swift_code",
    paramDescription: "8 or 11 characters, e.g. 'DEUTDEFF' or 'DEUTDEFF500'. Case and spaces are ignored.",
    label: "SWIFT/BIC code",
  },
  {
    name: "lookup_ifsc",
    title: "Look up an Indian IFSC code",
    description:
      "Resolve an 11 character Indian IFSC to its bank branch: institution, branch name, city and the 9-digit MICR when the source publishes it. IFSC format is four letters, a zero, then six alphanumerics. Works without an API key.",
    type: "IFSC",
    segment: "ifsc",
    param: "ifsc_code",
    paramDescription: "11 characters: four letters, a zero and six alphanumerics, e.g. 'HDFC0000001'.",
    label: "IFSC code",
  },
  {
    name: "lookup_cnaps",
    title: "Look up a Chinese CNAPS code",
    description:
      "Resolve a 12 digit CNAPS code (China's payment system code) to its bank branch: institution, branch, city and the 3-digit bank code prefix. Works without an API key.",
    type: "CNAPS",
    segment: "cnaps",
    param: "cnaps_code",
    paramDescription: "12 digits, e.g. '102100099996'.",
    label: "CNAPS code",
  },
  {
    name: "lookup_routing_number",
    title: "Look up a US ABA routing number",
    description:
      "Resolve a 9 digit US ABA routing number and report the checksum verdict, the institution, city and state. Use this for US ACH/wire routing numbers only. Works without an API key.",
    type: "ABA_ROUTING",
    segment: "routing",
    param: "routing_number",
    paramDescription: "9 digits, e.g. '021000021'.",
    label: "ABA routing number",
  },
  {
    name: "lookup_sort_code",
    title: "Look up a UK or Ireland sort code",
    description:
      "Resolve a 6 digit UK/Ireland sort code to its bank branch. A sort code is 6 digits, so a six-digit value is only a sort code when the user means the UK or Ireland - for an Australian code use lookup_bsb, for a card prefix use lookup_bin. Works without an API key.",
    type: "SORT_CODE",
    segment: "sort-code",
    param: "sort_code",
    paramDescription: "6 digits, usually written with hyphens, e.g. '60-83-71' or '608371'.",
    label: "sort code",
  },
  {
    name: "lookup_bsb",
    title: "Look up an Australian BSB number",
    description:
      "Resolve a 6 digit Australian BSB number to its bank branch: institution, branch, city and state. Six digits overlap with UK sort codes and card BINs, so only use this tool when the code is Australian. Works without an API key.",
    type: "BSB",
    segment: "bsb",
    param: "bsb",
    paramDescription: "6 digits, usually written with a hyphen, e.g. '062-000' or '062000'.",
    label: "BSB number",
  },
  {
    name: "lookup_bin",
    title: "Look up a card BIN/IIN",
    description:
      "Resolve a 6 to 8 digit card BIN/IIN to its issuer: scheme brand, card type, category, issuer name, country and the EU/EEA/SEPA flags. Use this for the leading digits of a card number, not for routing codes. Works without an API key.",
    type: "BIN",
    segment: "bin",
    param: "bin",
    paramDescription: "6 to 8 digits from the start of a card number, e.g. '457173'.",
    label: "card BIN",
  },
];

export function registerIdentifierTools(server: McpServer, client: FinCodeClient): void {
  for (const definition of CODE_TOOLS) {
    server.registerTool(
      definition.name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: {
          [definition.param]: z.string().min(1).describe(definition.paramDescription),
        },
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      async (args: Record<string, string>) => resolveCode(client, definition, args[definition.param] ?? ""),
    );
  }
}

async function resolveCode(
  client: FinCodeClient,
  definition: CodeToolDefinition,
  input: string,
): Promise<CallToolResult> {
  const value = normalizeIdentifier(input);

  try {
    const result = await client.get<Record<string, unknown>>(
      `/${definition.segment}/${encodeURIComponent(value)}`,
    );
    return jsonResult(
      withMeta(
        {
          found: true,
          type: definition.type,
          value,
          summary: summarize(result.data),
          result: result.data,
        },
        result,
      ),
    );
  } catch (error) {
    if (error instanceof FinCodeApiError) {
      if (error.code === "NOT_FOUND") return notFound(definition.label, value, error);
      if (error.isInputError) return invalidIdentifier(definition.label, value, error);
    }
    return failure(error, { type: definition.type, value });
  }
}

/** One-line digest for the model: institution plus city when the payload carries them. */
function summarize(data: Record<string, unknown>): string | undefined {
  // The API serialises snake_case globally, so `name_en` is the real field name.
  const bank = data.bank as Record<string, unknown> | null | undefined;
  const name =
    typeof bank?.name_en === "string"
      ? bank.name_en
      : typeof bank?.short_name === "string"
        ? bank.short_name
        : undefined;
  const city = typeof data.city === "string" ? data.city : undefined;

  if (name) return city ? `${name} (${city})` : name;
  if (typeof data.issuer === "string") return data.issuer;
  return undefined;
}
