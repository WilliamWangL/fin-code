package com.fincode.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Request/response payloads for PayPal subscription billing (FIN-019):
 * checkout, subscription state, invoices and the webhook acknowledgement.
 */
public final class BillingDtos {

    private BillingDtos() {
    }

    public record CheckoutRequest(@NotBlank String plan) {
    }

    public record CheckoutData(String subscriptionId, String status) {
    }

    public record ReviseRequest(@NotBlank String plan) {
    }

    public record ReviseData(String approveUrl) {
    }

    public record CancelRequest(@Size(max = 200) String reason) {
    }

    /** Plan catalog entry for the portal billing page. */
    public record BillingPlanData(
            String plan,
            Integer requestsPerMinute,
            Integer monthlyQuota,
            boolean checkoutAvailable) {
    }

    public record ProviderData(String name, String environment, boolean configured) {
    }

    public record SubscriptionData(
            Long id,
            String subscriptionId,
            String plan,
            String status,
            String payerId,
            LocalDateTime startTime,
            LocalDateTime nextBillingTime,
            LocalDateTime cancelledAt) {
    }

    public record BillingSummaryData(
            String plan,
            SubscriptionData subscription,
            List<BillingPlanData> plans,
            ProviderData provider) {
    }

    public record InvoiceLineData(String id, String status, String amount, String currency, LocalDateTime time) {
    }

    public record InvoiceData(String subscriptionId, List<InvoiceLineData> transactions) {
    }

    public record WebhookAck(String eventId, String eventType, boolean duplicate) {
    }
}
