/**
 * Server-side bridge to the FinCode API for live directory records (the L3
 * tier: institutions outside the per-country top-3 branch snapshots).
 *
 * Only import this module from Server Components and route handlers - the
 * server API key must never reach the browser (client code talks to the
 * /api/directory BFF routes instead).
 *
 * Environment:
 *   DIRECTORY_SERVER_API_KEY  API key (BUSINESS plan) minted for the website
 *   API_INTERNAL_URL          internal API base; the prod compose network
 *                             reaches the API as http://api:8080, local dev
 *                             falls back to the forwarded host port 8081
 *
 * JSON field names mirror the API's SNAKE_CASE serialization.
 */

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8081";
const SERVER_API_KEY = process.env.DIRECTORY_SERVER_API_KEY ?? "";

/** Fetch revalidation for live directory data (API Redis cache is layer 2). */
const REVALIDATE_SECONDS = 300;

export interface ApiIdentifier {
  type: string;
  value: string;
}

/** Shape of /v1/banks/{id} and /v1/banks/by-slug/{slug} `data`. */
export interface ApiBankDetail {
  id: string;
  name_en: string;
  name_local: string | null;
  short_name: string;
  country: string;
  website: string;
  status: string;
  identifiers: ApiIdentifier[];
  branch_count: number;
}

/** Shape of one /v1/banks/{id}/branches row. */
export interface ApiBranch {
  id: string;
  branch_name: string;
  branch_name_en: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  province: string | null;
  postal_code: string | null;
  code: string | null;
}

interface ApiEnvelope<T> {
  data: T;
  meta?: { next_cursor?: string | null } & Record<string, unknown>;
}

/**
 * Next.js 15 hands dynamic-segment params over percent-encoded, while
 * directory slugs are stored decoded (CJK slugs such as 北京银行). Decode
 * before any lookup; fall back to the raw value on malformed input.
 */
export function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_INTERNAL_URL}${path}`, {
      headers: { authorization: `Bearer ${SERVER_API_KEY}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    // API unreachable: callers fall back to ISR-rendered directory data.
    return null;
  }
}

/** Live institution detail by URL slug; null when unknown or unreachable. */
export async function fetchBankBySlug(slug: string): Promise<ApiBankDetail | null> {
  const envelope = await apiFetch<ApiEnvelope<ApiBankDetail>>(
    `/v1/banks/by-slug/${encodeURIComponent(slug)}`,
  );
  return envelope?.data ?? null;
}

export interface BranchPage {
  branches: ApiBranch[];
  nextCursor: string | null;
}

/** Cursor page of branches for a public institution id ("inst_123"). */
export async function fetchBankBranches(
  publicId: string,
  options: { q?: string; city?: string; cursor?: string | null; limit?: number } = {},
): Promise<BranchPage | null> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 50) });
  if (options.q) params.set("q", options.q);
  if (options.city) params.set("city", options.city);
  if (options.cursor) params.set("cursor", options.cursor);
  const envelope = await apiFetch<ApiEnvelope<ApiBranch[]>>(
    `/v1/banks/${encodeURIComponent(publicId)}/branches?${params.toString()}`,
  );
  if (!envelope) {
    return null;
  }
  return {
    branches: envelope.data ?? [],
    nextCursor: envelope.meta?.next_cursor ?? null,
  };
}
