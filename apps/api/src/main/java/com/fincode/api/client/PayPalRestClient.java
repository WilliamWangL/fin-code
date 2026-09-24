package com.fincode.api.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fincode.api.config.PayPalProperties;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * PayPal REST client (FIN-019) built on Spring's RestClient. The OAuth2
 * client-credentials token is cached until shortly before expiry; provider or
 * network failures surface as PAYMENT_PROVIDER_ERROR (502) and missing
 * credentials as BILLING_UNAVAILABLE (503) - never as internal errors.
 */
@Component
public class PayPalRestClient implements PayPalClient {

    private static final Logger log = LoggerFactory.getLogger(PayPalRestClient.class);
    private static final Duration TOKEN_SKEW = Duration.ofSeconds(60);

    private static final String HEADER_AUTH_ALGO = "paypal-auth-algo";
    private static final String HEADER_CERT_URL = "paypal-cert-url";
    private static final String HEADER_TRANSMISSION_ID = "paypal-transmission-id";
    private static final String HEADER_TRANSMISSION_SIG = "paypal-transmission-sig";
    private static final String HEADER_TRANSMISSION_TIME = "paypal-transmission-time";

    private final PayPalProperties properties;
    private final RestClient client;

    private volatile String accessToken;
    private volatile Instant tokenExpiresAt = Instant.EPOCH;

    public PayPalRestClient(PayPalProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.client = restClientBuilder.clone().baseUrl(properties.baseUrl()).build();
    }

    @Override
    public String createSubscription(String planId, String customId, String returnUrl, String cancelUrl) {
        Map<String, Object> applicationContext = new HashMap<>();
        applicationContext.put("brand_name", "FinCode");
        applicationContext.put("shipping_preference", "NO_SHIPPING");
        applicationContext.put("user_action", "SUBSCRIBE_NOW");
        applicationContext.put("return_url", returnUrl);
        applicationContext.put("cancel_url", cancelUrl);

        Map<String, Object> body = new HashMap<>();
        body.put("plan_id", planId);
        body.put("custom_id", customId);
        body.put("application_context", applicationContext);

        JsonNode response = execute(() -> client.post()
                .uri("/v1/billing/subscriptions")
                .headers(headers -> headers.setBearerAuth(token()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class));
        return requireText(response, "id");
    }

    @Override
    public SubscriptionInfo getSubscription(String subscriptionId) {
        JsonNode response = execute(() -> client.get()
                .uri("/v1/billing/subscriptions/{id}", subscriptionId)
                .headers(headers -> headers.setBearerAuth(token()))
                .retrieve()
                .body(JsonNode.class));
        if (response == null || response.isNull()) {
            throw providerError("PayPal returned an empty subscription");
        }
        return new SubscriptionInfo(
                response.path("id").asText(null),
                response.path("plan_id").asText(null),
                response.path("custom_id").asText(null),
                response.path("status").asText(null),
                response.path("subscriber").path("payer_id").asText(null),
                parseInstant(response.path("start_time").asText(null)),
                parseInstant(response.path("billing_info").path("next_billing_time").asText(null)));
    }

    @Override
    public void cancelSubscription(String subscriptionId, String reason) {
        Map<String, Object> body = Map.of(
                "reason", reason == null || reason.isBlank() ? "Cancelled from the FinCode portal" : reason);
        executeVoid(() -> client.post()
                .uri("/v1/billing/subscriptions/{id}/cancel", subscriptionId)
                .headers(headers -> headers.setBearerAuth(token()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity());
    }

    @Override
    public String reviseSubscription(String subscriptionId, String planId) {
        JsonNode response = execute(() -> client.post()
                .uri("/v1/billing/subscriptions/{id}/revise", subscriptionId)
                .headers(headers -> headers.setBearerAuth(token()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("plan_id", planId))
                .retrieve()
                .body(JsonNode.class));
        if (response != null) {
            for (JsonNode link : response.path("links")) {
                if ("approve".equals(link.path("rel").asText())) {
                    return link.path("href").asText();
                }
            }
        }
        // The change only takes effect after the buyer approves it; without an
        // approval link we cannot complete the upgrade and report the failure.
        throw providerError("PayPal did not return an approval link for the plan change");
    }

    @Override
    public List<TransactionInfo> listTransactions(String subscriptionId, Instant start, Instant end) {
        // Query values must go through the URI builder: a pre-encoded template
        // string gets encoded a second time (%3A arrives as %253A) and PayPal
        // rejects the request with INVALID_PARAMETER_SYNTAX.
        JsonNode response = execute(() -> client.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1/billing/subscriptions/{subscriptionId}/transactions")
                        .queryParam("start_time", start.truncatedTo(ChronoUnit.SECONDS).toString())
                        .queryParam("end_time", end.truncatedTo(ChronoUnit.SECONDS).toString())
                        .build(subscriptionId))
                .headers(headers -> headers.setBearerAuth(token()))
                .retrieve()
                .body(JsonNode.class));
        List<TransactionInfo> transactions = new ArrayList<>();
        for (JsonNode node : response.path("transactions")) {
            JsonNode gross = node.path("amount_with_breakdown").path("gross_amount");
            transactions.add(new TransactionInfo(
                    node.path("id").asText(null),
                    node.path("status").asText(null),
                    gross.path("value").asText(null),
                    gross.path("currency_code").asText(null),
                    parseInstant(node.path("time").asText(null))));
        }
        return transactions;
    }

    @Override
    public boolean verifyWebhookSignature(Map<String, String> headers, JsonNode event) {
        Map<String, Object> body = new HashMap<>();
        body.put("auth_algo", headers.get(HEADER_AUTH_ALGO));
        body.put("cert_url", headers.get(HEADER_CERT_URL));
        body.put("transmission_id", headers.get(HEADER_TRANSMISSION_ID));
        body.put("transmission_sig", headers.get(HEADER_TRANSMISSION_SIG));
        body.put("transmission_time", headers.get(HEADER_TRANSMISSION_TIME));
        body.put("webhook_id", properties.getWebhookId());
        body.put("webhook_event", event);
        if (body.values().stream().anyMatch(value -> value == null)) {
            log.warn("Webhook verification headers are incomplete");
            return false;
        }
        JsonNode response = execute(() -> client.post()
                .uri("/v1/notifications/verify-webhook-signature")
                .headers(requestHeaders -> requestHeaders.setBearerAuth(token()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class));
        return "SUCCESS".equalsIgnoreCase(response.path("verification_status").asText(""));
    }

    /** Cached OAuth2 token; refreshed shortly before expiry. */
    private String token() {
        if (!properties.isConfigured()) {
            throw new ApiException(ErrorCode.BILLING_UNAVAILABLE);
        }
        String cached = accessToken;
        if (cached != null && Instant.now().isBefore(tokenExpiresAt)) {
            return cached;
        }
        synchronized (this) {
            if (accessToken != null && Instant.now().isBefore(tokenExpiresAt)) {
                return accessToken;
            }
            JsonNode response = execute(() -> client.post()
                    .uri("/v1/oauth2/token")
                    .headers(headers -> headers.setBasicAuth(properties.getClientId(), properties.getClientSecret()))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body("grant_type=client_credentials")
                    .retrieve()
                    .body(JsonNode.class));
            accessToken = requireText(response, "access_token");
            long expiresIn = response.path("expires_in").asLong(3600);
            tokenExpiresAt = Instant.now().plusSeconds(expiresIn).minus(TOKEN_SKEW);
            return accessToken;
        }
    }

    private JsonNode execute(Supplier<JsonNode> call) {
        try {
            return call.get();
        } catch (RestClientResponseException exception) {
            log.warn("PayPal rejected a request: status={}", exception.getStatusCode().value());
            throw providerError("The payment provider rejected the request ("
                    + exception.getStatusCode().value() + ")");
        } catch (ResourceAccessException exception) {
            log.warn("PayPal is unreachable: {}", exception.getMessage());
            throw providerError("The payment provider is unreachable");
        }
    }

    private void executeVoid(Runnable call) {
        execute(() -> {
            call.run();
            return null;
        });
    }

    private static String requireText(JsonNode node, String field) {
        String value = node == null ? null : node.path(field).asText(null);
        if (value == null || value.isBlank()) {
            throw providerError("PayPal returned an unexpected response");
        }
        return value;
    }

    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (java.time.format.DateTimeParseException exception) {
            return null;
        }
    }

    private static ApiException providerError(String message) {
        return new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR, message);
    }
}
