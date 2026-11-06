import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { FinCodeClient } from "../client.js";
import { FinCodeApiError } from "../errors.js";
import { normalizeIdentifier } from "../normalize.js";
import { failure, jsonResult, withMeta } from "./shared.js";

/** Fields the IBAN endpoints return (see apps/api IbanDtos; the API serialises snake_case). */
export interface IbanValidationData {
  valid: boolean;
  iban: string;
  country?: string | null;
  check_digits?: string | null;
  bank_code?: string | null;
  account_number?: string | null;
  length?: number;
  expected_length?: number | null;
  checks?: Record<string, boolean>;
}

export interface IbanLookupData extends IbanValidationData {
  bank?: Record<string, unknown> | null;
}

/** IBAN-specific 422s are verdicts about the value, not integration failures. */
const IBAN_VERDICTS = new Set(["INVALID_IBAN", "IBAN_UNSUPPORTED_COUNTRY"]);

export function registerIbanTools(server: McpServer, client: FinCodeClient): void {
  server.registerTool(
    "validate_iban",
    {
      title: "Validate an IBAN",
      description:
        "Check an IBAN's country support, length, national structure and MOD-97 checksum, and parse out the bank code and account number. Returns valid=false with an error code (INVALID_IBAN, IBAN_UNSUPPORTED_COUNTRY) instead of failing the tool call. Validation never proves the account exists. Works without an API key.",
      inputSchema: {
        iban: z
          .string()
          .min(1)
          .describe("The IBAN, printed with or without spaces, e.g. 'DE89 3704 0044 0532 0130 00'."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ iban }) => validateIban(client, iban),
  );

  server.registerTool(
    "lookup_iban",
    {
      title: "Validate an IBAN and resolve its bank",
      description:
        "Parse an IBAN, validate it, and resolve the issuing institution (name, SWIFT/BIC, city) from the FinCode directory. The bank is null when the IBAN is well-formed but its bank is not in the dataset. Use validate_iban when only the format verdict is needed. Works without an API key.",
      inputSchema: {
        iban: z
          .string()
          .min(1)
          .describe("The IBAN, printed with or without spaces, e.g. 'GB82 WEST 1234 5698 7654 32'."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ iban }) => lookupIban(client, iban),
  );
}

export async function validateIban(client: FinCodeClient, iban: string): Promise<CallToolResult> {
  const value = normalizeIdentifier(iban);
  try {
    const result = await client.get<IbanValidationData>("/iban/validate", { iban: value });
    return jsonResult(withMeta({ ...result.data, valid: true }, result));
  } catch (error) {
    if (error instanceof FinCodeApiError && (IBAN_VERDICTS.has(error.code) || error.status === 422)) {
      return jsonResult({
        valid: false,
        iban: value,
        message: error.message,
        error: error.toJSON(),
      });
    }
    return failure(error, { iban: value });
  }
}

export async function lookupIban(client: FinCodeClient, iban: string): Promise<CallToolResult> {
  const value = normalizeIdentifier(iban);
  try {
    const result = await client.get<IbanLookupData>(`/iban/${encodeURIComponent(value)}`);
    const bank = result.data.bank ?? null;
    return jsonResult(
      withMeta(
        {
          found: true,
          ...result.data,
          ...(bank === null
            ? {
                note: "The IBAN is well-formed, but its bank is not in the directory. A valid IBAN confirms format only, never account existence.",
              }
            : {}),
        },
        result,
      ),
    );
  } catch (error) {
    if (error instanceof FinCodeApiError && (IBAN_VERDICTS.has(error.code) || error.status === 422)) {
      return jsonResult({
        found: false,
        valid: false,
        iban: value,
        message: error.message,
        error: error.toJSON(),
      });
    }
    if (error instanceof FinCodeApiError && error.code === "NOT_FOUND") {
      return jsonResult({
        found: false,
        valid: false,
        iban: value,
        message: `${value} could not be resolved.`,
        error: error.toJSON(),
      });
    }
    return failure(error, { iban: value });
  }
}
