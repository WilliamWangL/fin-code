import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { ApiResult } from "../client.js";
import { FinCodeApiError } from "../errors.js";

export const API_KEY_HINT =
  "Set FINCODE_API_KEY in the MCP server env block (free key: https://fincode.ecommica.com/register) and restart the server.";

/** Every tool answers with a single JSON document: easy for the model to quote and reason about. */
export function jsonResult(payload: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

/** Attach the API call's provenance so the model can quote a request id on support tickets. */
export function withMeta(payload: Record<string, unknown>, result: ApiResult<unknown>): Record<string, unknown> {
  return {
    ...payload,
    meta: {
      request_id: result.requestId,
      ...(result.rateLimit ? { rate_limit_remaining: result.rateLimit.remaining } : {}),
      ...(result.nextCursor ? { next_cursor: result.nextCursor } : {}),
    },
  };
}

/** The value exists in the dataset, but the lookup missed: an answer, not a failure. */
export function notFound(kind: string, value: string, error: FinCodeApiError): CallToolResult {
  return jsonResult({
    found: false,
    kind,
    value,
    message: `${value} is not in the FinCode dataset for ${kind}.`,
    error: error.toJSON(),
  });
}

/** A 422 from a typed endpoint: the value's shape is wrong for that identifier type. */
export function invalidIdentifier(kind: string, value: string, error: FinCodeApiError): CallToolResult {
  return jsonResult({
    found: false,
    valid: false,
    kind,
    value,
    message: error.message,
    error: error.toJSON(),
  });
}

/** Transport, auth and quota failures: the model should stop and tell the user what to fix. */
export function failure(error: unknown, extra: Record<string, unknown> = {}): CallToolResult {
  const payload =
    error instanceof FinCodeApiError
      ? { ...extra, error: error.toJSON(), ...(hintFor(error) ? { hint: hintFor(error) } : {}) }
      : {
          ...extra,
          error: {
            code: "MCP_SERVER_ERROR",
            message: error instanceof Error ? error.message : String(error),
          },
        };

  return { isError: true, content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

/** Keyless servers can still serve the public identifier lookups; paid endpoints cannot. */
export function missingApiKey(toolName: string): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            error: {
              code: "MISSING_API_KEY",
              message: `${toolName} queries the bank directory, which requires a FinCode API key.`,
            },
            hint: `${API_KEY_HINT} Keyless mode still covers one lookup tool per identifier family (lookup_swift_code, lookup_iban, lookup_ifsc, lookup_cnaps, lookup_routing_number, lookup_sort_code, lookup_bsb, lookup_bin) plus validate_iban.`,
          },
          null,
          2,
        ),
      },
    ],
  };
}

function hintFor(error: FinCodeApiError): string | undefined {
  switch (error.code) {
    case "UNAUTHORIZED":
    case "API_KEY_EXPIRED":
      return API_KEY_HINT;
    case "QUOTA_EXCEEDED":
      return "The API key's monthly request quota is exhausted. Check usage at https://fincode.ecommica.com/dashboard or upgrade the plan.";
    case "RATE_LIMITED":
      return error.retryAfterSeconds === undefined
        ? "Rate limited. Keyless calls share 10 requests per minute per IP; wait a moment or configure an API key."
        : `Rate limited: retry in ${error.retryAfterSeconds}s. Keyless calls share 10 requests per minute per IP; configure an API key for plan-level limits.`;
    case "TIMEOUT":
    case "NETWORK_ERROR":
      return "The FinCode API could not be reached. Check network access to https://api.ecommica.com, or override FINCODE_API_BASE_URL for a self-hosted instance.";
    default:
      return undefined;
  }
}
