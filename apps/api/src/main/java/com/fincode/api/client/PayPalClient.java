package com.fincode.api.client;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * PayPal Subscriptions REST operations used by FIN-019. Implementations talk
 * to the PayPal REST API; tests replace this bean with a mock so no real
 * PayPal credentials or sandbox are needed.
 */
public interface PayPalClient {

    /** Creates an approval-pending subscription and returns its PayPal id. */
    String createSubscription(String planId, String customId, String returnUrl, String cancelUrl);

    SubscriptionInfo getSubscription(String subscriptionId);

    void cancelSubscription(String subscriptionId, String reason);

    /** Revises the plan and returns the approval URL the buyer must visit. */
    String reviseSubscription(String subscriptionId, String planId);

    /** Provider-side transactions (invoices) for the subscription within one window. */
    List<TransactionInfo> listTransactions(String subscriptionId, Instant start, Instant end);

    /** PayPal-side signature verification of a raw webhook event. */
    boolean verifyWebhookSignature(Map<String, String> headers, JsonNode event);

    /** Provider state of a subscription, as far as billing needs it. */
    record SubscriptionInfo(
            String id,
            String planId,
            String customId,
            String status,
            String payerId,
            Instant startTime,
            Instant nextBillingTime) {
    }

    /** One provider transaction (invoice line). */
    record TransactionInfo(String id, String status, String amount, String currency, Instant time) {
    }
}
