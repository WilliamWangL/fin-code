/**
 * Wire types for the developer portal (FIN-017). The API serializes JSON in
 * snake_case (spec §25), so field names mirror the published contract.
 */

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface PortalUser {
  id: number;
  email: string;
  name: string | null;
  status: string;
  email_verified: boolean;
  created_at: string;
}

export interface PortalOrganization {
  id: number;
  name: string;
  slug: string;
  plan: string;
  role: string | null;
  created_at: string;
}

export interface RegisterData {
  user: PortalUser;
  organization: PortalOrganization;
  tokens: AuthTokens;
}

export interface LoginData {
  user: PortalUser;
  tokens: AuthTokens;
}

export interface MeData {
  user: PortalUser;
  organizations: PortalOrganization[];
}

export interface ApiKeyData {
  id: number;
  name: string;
  key_prefix: string;
  plan: string;
  status: string;
  organization_id: number;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ApiKeyCreatedData {
  api_key: ApiKeyData;
  key: string;
}

export interface QuotaData {
  period: string;
  plan: string;
  limit: number | null;
  used: number;
  remaining: number | null;
}

export interface UsageSummaryData {
  from: string;
  to: string;
  request_count: number;
  error_count: number;
  error_rate: number;
  avg_latency_ms: number;
  max_latency_ms: number;
  quota: QuotaData;
}

export interface EndpointUsageData {
  endpoint: string;
  request_count: number;
  error_count: number;
  error_rate: number;
  avg_latency_ms: number;
}

export interface DailyUsageData {
  date: string;
  request_count: number;
  error_count: number;
  avg_latency_ms: number;
}

export interface ApiKeyUsageData {
  api_key_id: number;
  request_count: number;
  error_count: number;
  error_rate: number;
  avg_latency_ms: number;
}

// --- Subscription billing (FIN-019) ---------------------------------------

export interface BillingPlanData {
  plan: string;
  requests_per_minute: number;
  monthly_quota?: number;
  checkout_available: boolean;
}

export interface BillingProviderData {
  name: string;
  environment: string;
  configured: boolean;
}

export interface BillingSubscriptionData {
  id: number;
  subscription_id: string;
  plan: string;
  status: string;
  payer_id?: string;
  start_time?: string;
  next_billing_time?: string;
  cancelled_at?: string;
}

export interface BillingSummaryData {
  plan: string;
  subscription?: BillingSubscriptionData;
  plans: BillingPlanData[];
  provider: BillingProviderData;
}

export interface BillingCheckoutData {
  subscription_id: string;
  status: string;
}

export interface BillingReviseData {
  approve_url: string;
}

export interface BillingInvoiceLineData {
  id: string;
  status: string;
  amount?: string;
  currency?: string;
  time?: string;
}

export interface BillingInvoiceData {
  subscription_id: string;
  transactions: BillingInvoiceLineData[];
}

/** Unified success envelope: {data, meta: {request_id}} (spec §25). */
export interface ApiEnvelope<T> {
  data: T;
  meta: { request_id: string };
}

/** Unified error envelope: {error: {code, message, request_id}} (spec §25). */
export interface ApiErrorEnvelope {
  error: { code: string; message: string; request_id?: string | null };
}
