package com.fincode.api.config;

/**
 * Route scopes for the two authentication schemes (spec §24, FIN-003):
 * developer accounts use JWTs on the portal paths, the data API uses API keys
 * everywhere else under /v1.
 */
public final class ApiScopes {

    private static final String[] PORTAL_PREFIXES =
            {"/v1/auth", "/v1/organizations", "/v1/api-keys", "/v1/usage", "/v1/billing"};

    /**
     * Provider callbacks that must reach the controller without either
     * authentication scheme (FIN-019): PayPal proves authenticity with its own
     * webhook signature verification.
     */
    private static final String[] PUBLIC_PREFIXES = {"/v1/webhooks"};

    private ApiScopes() {
    }

    public static boolean isPortalPath(String uri) {
        return matches(uri, PORTAL_PREFIXES);
    }

    public static boolean isPublicPath(String uri) {
        return matches(uri, PUBLIC_PREFIXES);
    }

    private static boolean matches(String uri, String[] prefixes) {
        if (uri == null) {
            return false;
        }
        for (String prefix : prefixes) {
            if (uri.equals(prefix) || uri.startsWith(prefix + "/")) {
                return true;
            }
        }
        return false;
    }
}
