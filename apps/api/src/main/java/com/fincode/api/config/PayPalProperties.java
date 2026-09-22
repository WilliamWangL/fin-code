package com.fincode.api.config;

import com.fincode.api.domain.enums.Plan;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * PayPal subscription settings (FIN-019). Secrets come from the environment
 * (spec §68) and never from Git; online billing stays disabled until the
 * client credentials and the PayPal plan ids are configured.
 */
@Component
@ConfigurationProperties(prefix = "fincode.paypal")
public class PayPalProperties {

    /** "sandbox" (default) or "live" - selects the PayPal REST host. */
    private String environment = "sandbox";

    private String clientId;

    private String clientSecret;

    /** Id of the webhook registered in the PayPal dashboard, used for signature verification. */
    private String webhookId;

    /** Where PayPal returns the buyer after approving a subscription. */
    private String returnUrl = "http://localhost:3000/dashboard/billing";

    private String cancelUrl = "http://localhost:3000/dashboard/billing";

    /** Local plan name (DEVELOPER, STARTUP, BUSINESS) to PayPal billing plan id. */
    private Map<String, String> plans = new LinkedHashMap<>();

    /** True when the REST client credentials are present. */
    public boolean isConfigured() {
        return isPresent(clientId) && isPresent(clientSecret);
    }

    /** True when webhook signature verification is possible. */
    public boolean isWebhookConfigured() {
        return isConfigured() && isPresent(webhookId);
    }

    public String baseUrl() {
        return "live".equalsIgnoreCase(environment)
                ? "https://api-m.paypal.com"
                : "https://api-m.sandbox.paypal.com";
    }

    /** PayPal billing plan id for a local plan, or null when it is not for sale. */
    public String planIdFor(Plan plan) {
        if (plan == null) {
            return null;
        }
        String planId = plans.get(plan.name());
        return isPresent(planId) ? planId : null;
    }

    /** Local plan for a PayPal billing plan id, or null when unknown. */
    public Plan planFor(String planId) {
        if (!isPresent(planId)) {
            return null;
        }
        return plans.entrySet().stream()
                .filter(entry -> planId.equals(entry.getValue()))
                .map(entry -> parsePlan(entry.getKey()))
                .filter(plan -> plan != null)
                .findFirst()
                .orElse(null);
    }

    private static Plan parsePlan(String name) {
        try {
            return Plan.valueOf(name.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private static boolean isPresent(String value) {
        return value != null && !value.isBlank();
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getWebhookId() {
        return webhookId;
    }

    public void setWebhookId(String webhookId) {
        this.webhookId = webhookId;
    }

    public String getReturnUrl() {
        return returnUrl;
    }

    public void setReturnUrl(String returnUrl) {
        this.returnUrl = returnUrl;
    }

    public String getCancelUrl() {
        return cancelUrl;
    }

    public void setCancelUrl(String cancelUrl) {
        this.cancelUrl = cancelUrl;
    }

    public Map<String, String> getPlans() {
        return plans;
    }

    public void setPlans(Map<String, String> plans) {
        this.plans = plans;
    }
}
