package com.fincode.api.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincode.api.client.PayPalClient;
import com.fincode.api.config.PayPalProperties;
import com.fincode.api.domain.enums.Plan;
import com.fincode.api.domain.model.ApiKey;
import com.fincode.api.domain.model.Organization;
import com.fincode.api.domain.model.PayPalSubscription;
import com.fincode.api.domain.model.PayPalWebhookEvent;
import com.fincode.api.domain.repository.ApiKeyRepository;
import com.fincode.api.domain.repository.OrganizationRepository;
import com.fincode.api.domain.repository.PayPalSubscriptionRepository;
import com.fincode.api.domain.repository.PayPalWebhookEventRepository;
import com.fincode.api.dto.BillingDtos.BillingPlanData;
import com.fincode.api.dto.BillingDtos.BillingSummaryData;
import com.fincode.api.dto.BillingDtos.CheckoutData;
import com.fincode.api.dto.BillingDtos.InvoiceData;
import com.fincode.api.dto.BillingDtos.InvoiceLineData;
import com.fincode.api.dto.BillingDtos.ProviderData;
import com.fincode.api.dto.BillingDtos.ReviseData;
import com.fincode.api.dto.BillingDtos.SubscriptionData;
import com.fincode.api.dto.BillingDtos.WebhookAck;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * PayPal subscription billing (FIN-019): checkout, provider state sync,
 * cancel/upgrade, invoices and webhook handling. The entitlement used by the
 * quota and rate limit checks is always the worst-case local state, so a
 * PayPal outage never unlocks paid limits - and the local plan is only ever
 * derived from verified provider events (webhook or REST pull).
 */
@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    /** Plans that can be bought online; FREE and ENTERPRISE are not for sale. */
    private static final List<Plan> PURCHASABLE_PLANS = List.of(Plan.DEVELOPER, Plan.STARTUP, Plan.BUSINESS);

    private static final Set<String> SUBSCRIPTION_EVENTS = Set.of(
            "BILLING.SUBSCRIPTION.ACTIVATED",
            "BILLING.SUBSCRIPTION.UPDATED",
            "BILLING.SUBSCRIPTION.SUSPENDED",
            "BILLING.SUBSCRIPTION.CANCELLED",
            "BILLING.SUBSCRIPTION.EXPIRED");

    private static final List<String> RECONCILE_STATUSES = List.of(
            PayPalSubscription.STATUS_APPROVED,
            PayPalSubscription.STATUS_ACTIVE,
            PayPalSubscription.STATUS_SUSPENDED,
            PayPalSubscription.STATUS_CANCELLED);

    private static final Duration SYNC_INTERVAL = Duration.ofHours(6);
    private static final int INVOICE_WINDOW_DAYS = 31;
    private static final int INVOICE_HISTORY_DAYS = 93;
    private static final int PAYLOAD_AUDIT_LENGTH = 2000;

    private final PayPalProperties properties;
    private final PayPalClient client;
    private final OrganizationRepository organizationRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final PayPalSubscriptionRepository subscriptionRepository;
    private final PayPalWebhookEventRepository webhookEventRepository;
    private final ObjectMapper objectMapper;

    public BillingService(PayPalProperties properties,
                          PayPalClient client,
                          OrganizationRepository organizationRepository,
                          ApiKeyRepository apiKeyRepository,
                          PayPalSubscriptionRepository subscriptionRepository,
                          PayPalWebhookEventRepository webhookEventRepository,
                          ObjectMapper objectMapper) {
        this.properties = properties;
        this.client = client;
        this.organizationRepository = organizationRepository;
        this.apiKeyRepository = apiKeyRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.webhookEventRepository = webhookEventRepository;
        this.objectMapper = objectMapper;
    }

    // ── Portal operations ───────────────────────────────────────────────────

    /** Current plan, latest subscription and the purchasable plan catalog. */
    @Transactional(readOnly = true)
    public BillingSummaryData summary(Long organizationId) {
        Organization organization = requireOrganization(organizationId);
        SubscriptionData subscription = subscriptionRepository.findByOrganizationIdOrderByIdDesc(organizationId)
                .stream()
                .findFirst()
                .map(BillingService::toSubscriptionData)
                .orElse(null);
        List<BillingPlanData> plans = PURCHASABLE_PLANS.stream()
                .map(plan -> new BillingPlanData(
                        plan.name(),
                        plan.requestsPerMinute(),
                        plan.monthlyQuota() == Integer.MAX_VALUE ? null : plan.monthlyQuota(),
                        properties.planIdFor(plan) != null))
                .toList();
        return new BillingSummaryData(organization.getPlan().name(), subscription, plans,
                new ProviderData("paypal", properties.getEnvironment(), properties.isConfigured()));
    }

    /**
     * Creates a PayPal subscription in APPROVAL_PENDING state; the plan only
     * changes after the buyer approves it and the activation is confirmed.
     */
    @Transactional
    public CheckoutData startCheckout(Long organizationId, String planName) {
        Plan plan = parsePurchasablePlan(planName);
        requireConfigured();
        String planId = requirePlanId(plan);
        // Exactly one live subscription at a time; a cancelled one keeps its
        // grace access but must not block a new checkout (re-subscribe).
        boolean liveSubscription = subscriptionRepository.findByOrganizationIdOrderByIdDesc(organizationId)
                .stream()
                .anyMatch(BillingService::isLive);
        if (liveSubscription) {
            throw new ApiException(ErrorCode.SUBSCRIPTION_ALREADY_ACTIVE);
        }
        String customId = String.valueOf(organizationId);
        String subscriptionId = client.createSubscription(
                planId, customId, properties.getReturnUrl(), properties.getCancelUrl());
        PayPalClient.SubscriptionInfo info = client.getSubscription(subscriptionId);
        if (info.customId() != null && !customId.equals(info.customId())) {
            throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR,
                    "The subscription does not belong to this organization");
        }
        PayPalSubscription record = upsertRecord(organizationId, info);
        return new CheckoutData(subscriptionId, record.getStatus());
    }

    /** Pulls the provider state after buyer approval and applies the entitlement. */
    @Transactional
    public BillingSummaryData confirm(Long organizationId, String subscriptionId) {
        requireConfigured();
        PayPalSubscription record = requireOwnedSubscription(organizationId, subscriptionId);
        syncFromProvider(record);
        return summary(organizationId);
    }

    /** Starts an up- or downgrade; the buyer completes it through PayPal's approval page. */
    @Transactional
    public ReviseData revise(Long organizationId, String subscriptionId, String planName) {
        Plan plan = parsePurchasablePlan(planName);
        requireConfigured();
        String planId = requirePlanId(plan);
        PayPalSubscription record = requireOwnedSubscription(organizationId, subscriptionId);
        if (PayPalSubscription.STATUS_CANCELLED.equals(record.getStatus())
                || PayPalSubscription.STATUS_EXPIRED.equals(record.getStatus())) {
            throw new ApiException(ErrorCode.SUBSCRIPTION_NOT_CHANGEABLE);
        }
        if (record.getPlan() == plan) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "The subscription is already on this plan");
        }
        return new ReviseData(client.reviseSubscription(subscriptionId, planId));
    }

    /**
     * Cancels at PayPal. The paid plan is kept until the end of the billing
     * period (next billing time); the reconciliation job downgrades afterwards.
     */
    @Transactional
    public BillingSummaryData cancel(Long organizationId, String subscriptionId, String reason) {
        requireConfigured();
        PayPalSubscription record = requireOwnedSubscription(organizationId, subscriptionId);
        if (!PayPalSubscription.STATUS_CANCELLED.equals(record.getStatus())
                && !PayPalSubscription.STATUS_EXPIRED.equals(record.getStatus())) {
            client.cancelSubscription(subscriptionId, reason);
            record.setStatus(PayPalSubscription.STATUS_CANCELLED);
            record.setCancelledAt(now());
            record.setSyncedAt(now());
            subscriptionRepository.save(record);
        }
        recomputeOrganizationPlan(organizationId);
        return summary(organizationId);
    }

    /** Provider transactions (invoices) for the last 93 days. */
    @Transactional(readOnly = true)
    public InvoiceData invoices(Long organizationId, String subscriptionId) {
        requireConfigured();
        requireOwnedSubscription(organizationId, subscriptionId);
        Instant end = Instant.now();
        Instant start = end.minus(Duration.ofDays(INVOICE_HISTORY_DAYS));
        List<InvoiceLineData> lines = new ArrayList<>();
        for (Instant windowStart = start; windowStart.isBefore(end); ) {
            Instant windowEnd = min(windowStart.plus(Duration.ofDays(INVOICE_WINDOW_DAYS)), end);
            client.listTransactions(subscriptionId, windowStart, windowEnd)
                    .forEach(transaction -> lines.add(toInvoiceLine(transaction)));
            windowStart = windowEnd;
        }
        lines.sort(Comparator.comparing(InvoiceLineData::time, Comparator.nullsLast(Comparator.reverseOrder())));
        return new InvoiceData(subscriptionId, lines);
    }

    // ── Webhook handling ────────────────────────────────────────────────────

    /**
     * Verifies and applies a PayPal webhook event. Events are deduplicated by
     * PayPal's event id, and unverified events are rejected so PayPal retries.
     */
    @Transactional
    public WebhookAck handleWebhook(Map<String, String> headers, String rawBody) {
        if (!properties.isWebhookConfigured()) {
            throw new ApiException(ErrorCode.BILLING_UNAVAILABLE);
        }
        JsonNode event;
        try {
            event = objectMapper.readTree(rawBody);
        } catch (JsonProcessingException exception) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "The webhook payload is not valid JSON");
        }
        String eventId = event.path("id").asText(null);
        String eventType = event.path("event_type").asText("");
        if (eventId == null || eventId.isBlank()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "The webhook payload has no event id");
        }
        if (webhookEventRepository.existsByEventId(eventId)) {
            return new WebhookAck(eventId, eventType, true);
        }
        if (!client.verifyWebhookSignature(headers, event)) {
            throw new ApiException(ErrorCode.INVALID_WEBHOOK_SIGNATURE);
        }

        JsonNode resource = event.path("resource");
        PayPalWebhookEvent row = new PayPalWebhookEvent();
        row.setEventId(eventId);
        row.setEventType(eventType);
        row.setSubscriptionId(resourceIdFor(eventType, resource));
        row.setVerified(true);
        row.setPayload(truncate(rawBody));
        row.setProcessedAt(now());
        webhookEventRepository.save(row);

        if (SUBSCRIPTION_EVENTS.contains(eventType)) {
            applySubscriptionEvent(resource);
        } else {
            log.debug("PayPal event {} acknowledged without state change", eventType);
        }
        return new WebhookAck(eventId, eventType, false);
    }

    /** Applies a BILLING.SUBSCRIPTION.* event to the mirrored subscription. */
    private void applySubscriptionEvent(JsonNode resource) {
        String subscriptionId = resource.path("id").asText(null);
        if (subscriptionId == null || subscriptionId.isBlank()) {
            log.warn("Webhook for a subscription event carried no subscription id");
            return;
        }
        PayPalSubscription record = subscriptionRepository.findBySubscriptionId(subscriptionId).orElse(null);
        if (record == null) {
            Long organizationId = parseOrganizationId(resource.path("custom_id").asText(null));
            if (organizationId == null || !organizationRepository.existsById(organizationId)) {
                log.warn("Webhook for unknown subscription {} ignored", subscriptionId);
                return;
            }
            record = new PayPalSubscription();
            record.setOrganizationId(organizationId);
            record.setSubscriptionId(subscriptionId);
        }
        applyResource(record, resource);
        subscriptionRepository.save(record);
        recomputeOrganizationPlan(record.getOrganizationId());
    }

    // ── Reconciliation ──────────────────────────────────────────────────────

    /**
     * Re-syncs subscriptions whose period ended or whose state is stale
     * (missed webhook). Returns how many subscriptions were reconciled.
     */
    @Transactional
    public int reconcileStaleSubscriptions() {
        if (!properties.isConfigured()) {
            return 0;
        }
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        int synced = 0;
        for (PayPalSubscription subscription : subscriptionRepository.findByStatusIn(RECONCILE_STATUSES)) {
            if (!isStale(subscription, now)) {
                continue;
            }
            try {
                syncFromProvider(subscription);
                synced++;
            } catch (ApiException exception) {
                log.warn("Subscription sync failed [subscription={}]: {}",
                        subscription.getSubscriptionId(), exception.getMessage());
            }
        }
        return synced;
    }

    private static boolean isStale(PayPalSubscription subscription, ZonedDateTime now) {
        LocalDateTime syncedAt = subscription.getSyncedAt();
        if (syncedAt == null || syncedAt.isBefore(now.toLocalDateTime().minus(SYNC_INTERVAL))) {
            return true;
        }
        // Past the paid period: the entitlement may have ended provider-side.
        return subscription.getNextBillingTime() != null
                && !subscription.getNextBillingTime().isAfter(now.toLocalDateTime());
    }

    // ── Provider state <-> local subscription ───────────────────────────────

    /** Pulls provider state, then recomputes the organization plan. */
    private void syncFromProvider(PayPalSubscription record) {
        PayPalClient.SubscriptionInfo info = client.getSubscription(record.getSubscriptionId());
        if (info.customId() != null
                && !info.customId().equals(String.valueOf(record.getOrganizationId()))) {
            throw new ApiException(ErrorCode.NOT_FOUND, "The subscription does not exist");
        }
        applyInfo(record, info);
        subscriptionRepository.save(record);
        recomputeOrganizationPlan(record.getOrganizationId());
    }

    private PayPalSubscription upsertRecord(Long organizationId, PayPalClient.SubscriptionInfo info) {
        PayPalSubscription record = subscriptionRepository.findBySubscriptionId(info.id())
                .filter(existing -> existing.getOrganizationId().equals(organizationId))
                .orElseGet(() -> {
                    PayPalSubscription created = new PayPalSubscription();
                    created.setOrganizationId(organizationId);
                    created.setSubscriptionId(info.id());
                    return created;
                });
        applyInfo(record, info);
        return subscriptionRepository.save(record);
    }

    private void applyInfo(PayPalSubscription record, PayPalClient.SubscriptionInfo info) {
        applyStatus(record, info.status());
        Plan plan = properties.planFor(info.planId());
        if (plan != null) {
            record.setPlan(plan);
        }
        if (info.payerId() != null) {
            record.setPayerId(info.payerId());
        }
        LocalDateTime startTime = toUtc(info.startTime());
        if (startTime != null) {
            record.setStartTime(startTime);
        }
        LocalDateTime nextBillingTime = toUtc(info.nextBillingTime());
        if (nextBillingTime != null) {
            record.setNextBillingTime(nextBillingTime);
        }
        record.setSyncedAt(now());
    }

    private void applyResource(PayPalSubscription record, JsonNode resource) {
        applyStatus(record, resource.path("status").asText(null));
        Plan plan = properties.planFor(resource.path("plan_id").asText(null));
        if (plan != null) {
            record.setPlan(plan);
        }
        String payerId = resource.path("subscriber").path("payer_id").asText(null);
        if (payerId != null && !payerId.isBlank()) {
            record.setPayerId(payerId);
        }
        LocalDateTime startTime = toUtc(resource.path("start_time").asText(null));
        if (startTime != null) {
            record.setStartTime(startTime);
        }
        LocalDateTime nextBillingTime = toUtc(resource.path("billing_info").path("next_billing_time").asText(null));
        if (nextBillingTime != null) {
            record.setNextBillingTime(nextBillingTime);
        }
        record.setLastEventAt(now());
        record.setSyncedAt(now());
    }

    private static void applyStatus(PayPalSubscription record, String status) {
        if (status == null || status.isBlank()) {
            return;
        }
        if (PayPalSubscription.STATUS_CANCELLED.equals(status) && record.getCancelledAt() == null) {
            record.setCancelledAt(now());
        }
        record.setStatus(status);
    }

    // ── Entitlement ─────────────────────────────────────────────────────────

    /**
     * Recomputes the organization plan from its subscriptions and propagates
     * it to the API keys so quota and rate limits adapt to the paid tier.
     */
    private void recomputeOrganizationPlan(Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId).orElse(null);
        if (organization == null) {
            return;
        }
        Plan effective = effectivePlan(organizationId);
        if (organization.getPlan() == effective) {
            return;
        }
        organization.setPlan(effective);
        List<ApiKey> keys = apiKeyRepository.findByOrganizationIdOrderByIdDesc(organizationId);
        for (ApiKey key : keys) {
            key.setPlan(effective);
        }
        apiKeyRepository.saveAll(keys);
        log.info("Organization {} plan changed to {} by PayPal billing", organizationId, effective);
    }

    /** Best entitled plan of the organization; FREE when nothing entitles. */
    private Plan effectivePlan(Long organizationId) {
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        Plan effective = Plan.FREE;
        for (PayPalSubscription subscription : subscriptionRepository.findByOrganizationIdOrderByIdDesc(organizationId)) {
            if (isEntitled(subscription, now) && subscription.getPlan().ordinal() > effective.ordinal()) {
                effective = subscription.getPlan();
            }
        }
        return effective;
    }

    /** ACTIVE/APPROVED/SUSPENDED: live at the provider and still changeable. */
    private static boolean isLive(PayPalSubscription subscription) {
        String status = subscription.getStatus();
        return PayPalSubscription.STATUS_ACTIVE.equals(status)
                || PayPalSubscription.STATUS_APPROVED.equals(status)
                || PayPalSubscription.STATUS_SUSPENDED.equals(status);
    }

    /**
     * Live subscriptions entitle; a CANCELLED one keeps the entitlement until
     * the already-paid period ends.
     */
    private static boolean isEntitled(PayPalSubscription subscription, ZonedDateTime now) {
        if (isLive(subscription)) {
            return true;
        }
        return PayPalSubscription.STATUS_CANCELLED.equals(subscription.getStatus())
                && subscription.getNextBillingTime() != null
                && subscription.getNextBillingTime().isAfter(now.toLocalDateTime());
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private Organization requireOrganization(Long organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "The organization does not exist"));
    }

    private PayPalSubscription requireOwnedSubscription(Long organizationId, String subscriptionId) {
        PayPalSubscription record = subscriptionRepository.findBySubscriptionId(subscriptionId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "The subscription does not exist"));
        if (!record.getOrganizationId().equals(organizationId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "The subscription does not exist");
        }
        return record;
    }

    private void requireConfigured() {
        if (!properties.isConfigured()) {
            throw new ApiException(ErrorCode.BILLING_UNAVAILABLE);
        }
    }

    private static Plan parsePurchasablePlan(String planName) {
        if (planName == null || planName.isBlank()) {
            throw new ApiException(ErrorCode.MISSING_PARAMETER, "The plan is required");
        }
        Plan plan;
        try {
            plan = Plan.valueOf(planName.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ApiException(ErrorCode.PLAN_NOT_PURCHASABLE, "Unknown plan: " + planName);
        }
        if (!PURCHASABLE_PLANS.contains(plan)) {
            throw new ApiException(ErrorCode.PLAN_NOT_PURCHASABLE, plan.name() + " cannot be purchased online");
        }
        return plan;
    }

    private String requirePlanId(Plan plan) {
        String planId = properties.planIdFor(plan);
        if (planId == null) {
            throw new ApiException(ErrorCode.PLAN_NOT_PURCHASABLE,
                    plan.name() + " is not configured for PayPal checkout");
        }
        return planId;
    }

    private static Long parseOrganizationId(String customId) {
        if (customId == null || customId.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(customId.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static String resourceIdFor(String eventType, JsonNode resource) {
        if (SUBSCRIPTION_EVENTS.contains(eventType)) {
            return resource.path("id").asText(null);
        }
        return resource.path("billing_agreement_id").asText(null);
    }

    private static SubscriptionData toSubscriptionData(PayPalSubscription subscription) {
        return new SubscriptionData(
                subscription.getId(),
                subscription.getSubscriptionId(),
                subscription.getPlan().name(),
                subscription.getStatus(),
                subscription.getPayerId(),
                subscription.getStartTime(),
                subscription.getNextBillingTime(),
                subscription.getCancelledAt());
    }

    private static InvoiceLineData toInvoiceLine(PayPalClient.TransactionInfo transaction) {
        return new InvoiceLineData(
                transaction.id(),
                transaction.status(),
                transaction.amount(),
                transaction.currency(),
                toUtc(transaction.time()));
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private static LocalDateTime toUtc(Instant instant) {
        return instant == null ? null : LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    private static LocalDateTime toUtc(String isoInstant) {
        if (isoInstant == null || isoInstant.isBlank()) {
            return null;
        }
        try {
            return toUtc(Instant.parse(isoInstant));
        } catch (java.time.format.DateTimeParseException exception) {
            return null;
        }
    }

    private static String truncate(String value) {
        if (value == null || value.length() <= PAYLOAD_AUDIT_LENGTH) {
            return value;
        }
        return value.substring(0, PAYLOAD_AUDIT_LENGTH);
    }

    private static Instant min(Instant first, Instant second) {
        return first.isBefore(second) ? first : second;
    }
}
