import { PortalApiError } from "@/lib/portal/api";

/**
 * Maps API error codes to localized portal messages (FIN-017). The server
 * message is the fallback so unmapped codes still surface something useful.
 */
export function portalErrorMessage(
  error: unknown,
  t: (key: string) => string,
  fallbackKey = "genericError",
): string {
  if (error instanceof PortalApiError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return t("loginError");
      case "EMAIL_ALREADY_EXISTS":
        return t("emailTaken");
      case "NETWORK":
        return t("networkError");
      case "UNAUTHORIZED":
      case "TOKEN_EXPIRED":
        return t("sessionExpired");
      case "BILLING_UNAVAILABLE":
        return t("billingUnavailable");
      case "PLAN_NOT_PURCHASABLE":
        return t("planUnavailable");
      case "SUBSCRIPTION_ALREADY_ACTIVE":
        return t("alreadySubscribed");
      case "PAYMENT_PROVIDER_ERROR":
        return t("providerError");
      default:
        return error.message || t(fallbackKey);
    }
  }
  return t(fallbackKey);
}
