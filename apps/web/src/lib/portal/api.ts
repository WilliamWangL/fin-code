import { siteConfig } from "@/lib/site";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
  type PortalIdentity,
} from "@/lib/portal/session";
import type {
  ApiEnvelope,
  ApiErrorEnvelope,
  ApiKeyCreatedData,
  ApiKeyData,
  ApiKeyUsageData,
  AuthTokens,
  BillingCheckoutData,
  BillingInvoiceData,
  BillingReviseData,
  BillingSummaryData,
  DailyUsageData,
  EndpointUsageData,
  LoginData,
  MeData,
  RegisterData,
  UsageSummaryData,
} from "@/lib/portal/types";

/**
 * Browser client for the developer portal endpoints (FIN-017). Talks to the
 * API over CORS with a Bearer access token; a 401 on an authenticated call
 * triggers a single refresh-and-retry before the session is cleared.
 */

export class PortalApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "PortalApiError";
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  /** Attach the access token (default true). */
  auth?: boolean;
  /** Allow one refresh-and-retry cycle after a 401 (default true). */
  retry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retry = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const token = auth ? getAccessToken() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new PortalApiError("NETWORK", "Cannot reach the FinCode API", 0);
  }

  if (response.status === 401 && auth && token && retry && (await tryRefresh())) {
    return request<T>(path, { ...options, retry: false });
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | ApiErrorEnvelope
    | null;

  if (!response.ok) {
    const error = (payload as ApiErrorEnvelope | null)?.error;
    throw new PortalApiError(
      error?.code ?? "INTERNAL",
      error?.message ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }
  return (payload as ApiEnvelope<T>).data;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    return false;
  }
  try {
    const tokens = await request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
      auth: false,
      retry: false,
    });
    saveSession(tokens);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

function withWindow(path: string, from?: string, to?: string): string {
  const query = new URLSearchParams();
  if (from) {
    query.set("from", from);
  }
  if (to) {
    query.set("to", to);
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

// --- Auth -----------------------------------------------------------------

export function register(input: { email: string; password: string; name?: string }): Promise<RegisterData> {
  return request<RegisterData>("/auth/register", { method: "POST", body: input, auth: false });
}

export function login(input: { email: string; password: string }): Promise<LoginData> {
  return request<LoginData>("/auth/login", { method: "POST", body: input, auth: false });
}

/** Revokes the refresh token server-side, then clears the local session. */
export async function logout(): Promise<void> {
  try {
    await request<{ logged_out: boolean }>("/auth/logout", {
      method: "POST",
      body: { refresh_token: getRefreshToken() },
    });
  } catch {
    // Best effort: the local session is cleared either way.
  } finally {
    clearSession();
  }
}

export function fetchMe(): Promise<MeData> {
  return request<MeData>("/auth/me");
}

export function savePortalSession(tokens: AuthTokens, user: PortalIdentity): void {
  saveSession(tokens, user);
}

// --- API keys -------------------------------------------------------------

export function fetchApiKeys(): Promise<ApiKeyData[]> {
  return request<ApiKeyData[]>("/api-keys");
}

export function createApiKey(input: { name: string; live: boolean }): Promise<ApiKeyCreatedData> {
  return request<ApiKeyCreatedData>("/api-keys", { method: "POST", body: input });
}

export function rotateApiKey(id: number): Promise<ApiKeyCreatedData> {
  return request<ApiKeyCreatedData>(`/api-keys/${id}/rotate`, { method: "POST" });
}

export function revokeApiKey(id: number): Promise<ApiKeyData> {
  return request<ApiKeyData>(`/api-keys/${id}`, { method: "DELETE" });
}

// --- Usage ----------------------------------------------------------------

export function fetchUsageSummary(from?: string, to?: string): Promise<UsageSummaryData> {
  return request<UsageSummaryData>(withWindow("/usage", from, to));
}

export function fetchUsageEndpoints(from?: string, to?: string): Promise<EndpointUsageData[]> {
  return request<EndpointUsageData[]>(withWindow("/usage/endpoints", from, to));
}

export function fetchUsageDaily(from?: string, to?: string): Promise<DailyUsageData[]> {
  return request<DailyUsageData[]>(withWindow("/usage/daily", from, to));
}

export function fetchUsageKeys(from?: string, to?: string): Promise<ApiKeyUsageData[]> {
  return request<ApiKeyUsageData[]>(withWindow("/usage/keys", from, to));
}

// --- Billing (FIN-019) ------------------------------------------------------

export function fetchBillingSummary(): Promise<BillingSummaryData> {
  return request<BillingSummaryData>("/billing");
}

/** Creates a PayPal subscription awaiting buyer approval (SDK checkout). */
export function startCheckout(plan: string): Promise<BillingCheckoutData> {
  return request<BillingCheckoutData>("/billing/checkout", { method: "POST", body: { plan } });
}

/** Syncs the provider state after the buyer approved the subscription. */
export function confirmSubscription(subscriptionId: string): Promise<BillingSummaryData> {
  return request<BillingSummaryData>(
    `/billing/subscriptions/${encodeURIComponent(subscriptionId)}/confirm`,
    { method: "POST" },
  );
}

/** Starts an up-/downgrade; the returned URL must be opened by the buyer. */
export function reviseSubscription(subscriptionId: string, plan: string): Promise<BillingReviseData> {
  return request<BillingReviseData>(
    `/billing/subscriptions/${encodeURIComponent(subscriptionId)}/revise`,
    { method: "POST", body: { plan } },
  );
}

export function cancelSubscription(subscriptionId: string, reason?: string): Promise<BillingSummaryData> {
  return request<BillingSummaryData>(
    `/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    { method: "POST", body: reason === undefined ? {} : { reason } },
  );
}

export function fetchInvoices(subscriptionId: string): Promise<BillingInvoiceData> {
  return request<BillingInvoiceData>(
    `/billing/invoices?subscription_id=${encodeURIComponent(subscriptionId)}`,
  );
}
