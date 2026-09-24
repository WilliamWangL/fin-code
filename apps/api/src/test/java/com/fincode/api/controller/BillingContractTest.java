package com.fincode.api.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fincode.api.TestcontainersConfiguration;
import com.fincode.api.client.PayPalClient;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Contract tests for PayPal subscription billing (FIN-019) over the real
 * filter chain: checkout, confirmation, plan/API key propagation, cancel,
 * revise, invoices and webhook handling. The PayPal REST client is mocked so
 * the suite runs without sandbox credentials; entitlement changes must only
 * ever derive from verified provider state (confirm or verified webhook).
 *
 * Role model (FIN-004): only the OWNER manages billing; a registered account
 * is OWNER of its own organization, which every test exercises.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = {
        "fincode.paypal.environment=sandbox",
        "fincode.paypal.client-id=test-client",
        "fincode.paypal.client-secret=test-secret",
        "fincode.paypal.webhook-id=test-webhook",
        "fincode.paypal.plans.DEVELOPER=plan-dev-1",
        "fincode.paypal.plans.STARTUP=plan-startup-1",
        "fincode.paypal.plans.BUSINESS=plan-business-1",
        // Keep the reconciliation scheduler out of the test window.
        "fincode.paypal.sync-initial-delay=PT1H"})
class BillingContractTest {

    private static final String PASSWORD = "secret-pass-123";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PayPalClient payPalClient;

    // ── Summary ─────────────────────────────────────────────────────────────

    @Test
    void summaryRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/v1/billing"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("X-Request-Id"))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void summaryListsPlansAndProvider() throws Exception {
        Session session = register();
        mockMvc.perform(get("/v1/billing").header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("FREE"))
                .andExpect(jsonPath("$.data.subscription").doesNotExist())
                .andExpect(jsonPath("$.data.provider.name").value("paypal"))
                .andExpect(jsonPath("$.data.provider.environment").value("sandbox"))
                .andExpect(jsonPath("$.data.provider.configured").value(true))
                .andExpect(jsonPath("$.data.plans", hasSize(3)))
                .andExpect(jsonPath("$.data.plans[0].plan").value("DEVELOPER"))
                .andExpect(jsonPath("$.data.plans[0].monthly_quota").value(20_000))
                .andExpect(jsonPath("$.data.plans[0].checkout_available").value(true));
    }

    // ── Checkout and confirmation ───────────────────────────────────────────

    @Test
    void checkoutConfirmUpgradesPlanAndKeys() throws Exception {
        Session session = register();
        createApiKey(session.accessToken(), "billing-main");

        when(payPalClient.createSubscription(eq("plan-dev-1"), eq(String.valueOf(session.organizationId())),
                anyString(), anyString())).thenReturn("I-TEST0001");
        when(payPalClient.getSubscription("I-TEST0001")).thenReturn(new PayPalClient.SubscriptionInfo(
                "I-TEST0001", "plan-dev-1", String.valueOf(session.organizationId()),
                "APPROVAL_PENDING", null, null, null));

        mockMvc.perform(post("/v1/billing/checkout")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\":\"DEVELOPER\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.subscription_id").value("I-TEST0001"))
                .andExpect(jsonPath("$.data.status").value("APPROVAL_PENDING"));

        // Pending approval: no entitlement yet.
        mockMvc.perform(get("/v1/billing").header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken())))
                .andExpect(jsonPath("$.data.plan").value("FREE"))
                .andExpect(jsonPath("$.data.subscription.status").value("APPROVAL_PENDING"));

        when(payPalClient.getSubscription("I-TEST0001")).thenReturn(new PayPalClient.SubscriptionInfo(
                "I-TEST0001", "plan-dev-1", String.valueOf(session.organizationId()),
                "ACTIVE", "PAYER-0001", Instant.now(), Instant.now().plus(Duration.ofDays(30))));

        mockMvc.perform(post("/v1/billing/subscriptions/I-TEST0001/confirm")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("DEVELOPER"))
                .andExpect(jsonPath("$.data.subscription.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.subscription.payer_id").value("PAYER-0001"))
                .andExpect(jsonPath("$.data.subscription.next_billing_time").isNotEmpty());

        // The paid tier propagates to the API keys so quota and rate limits follow.
        mockMvc.perform(get("/v1/api-keys").header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].plan").value("DEVELOPER"));
    }

    @Test
    void checkoutRejectsUnpurchasablePlans() throws Exception {
        Session session = register();
        for (String plan : new String[] {"FREE", "ENTERPRISE", "GOLD"}) {
            mockMvc.perform(post("/v1/billing/checkout")
                            .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"plan\":\"" + plan + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("PLAN_NOT_PURCHASABLE"));
        }
    }

    // ── Revise and cancel ───────────────────────────────────────────────────

    @Test
    void reviseReturnsApprovalUrl() throws Exception {
        Session session = register();
        startPendingCheckout(session, "I-TEST0002");

        when(payPalClient.reviseSubscription("I-TEST0002", "plan-startup-1"))
                .thenReturn("https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-TEST");

        mockMvc.perform(post("/v1/billing/subscriptions/I-TEST0002/revise")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\":\"STARTUP\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.approve_url", startsWith("https://www.sandbox.paypal.com")));
    }

    @Test
    void cancelKeepsPlanUntilPeriodEnd() throws Exception {
        Session session = register();
        activateSubscription(session, "I-TEST0003");

        mockMvc.perform(post("/v1/billing/subscriptions/I-TEST0003/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Switching providers\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subscription.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.plan").value("DEVELOPER"))
                .andExpect(jsonPath("$.data.subscription.cancelled_at").isNotEmpty());
    }

    @Test
    void reviseRejectsCancelledSubscription() throws Exception {
        Session session = register();
        activateSubscription(session, "I-TEST0006");

        mockMvc.perform(post("/v1/billing/subscriptions/I-TEST0006/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"testing\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/v1/billing/subscriptions/I-TEST0006/revise")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\":\"STARTUP\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SUBSCRIPTION_NOT_CHANGEABLE"));
    }

    @Test
    void checkoutAllowedAfterCancellation() throws Exception {
        Session session = register();
        activateSubscription(session, "I-TEST0007");

        mockMvc.perform(post("/v1/billing/subscriptions/I-TEST0007/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"re-subscribe\"}"))
                .andExpect(status().isOk());

        // The cancelled subscription keeps grace access but must not block a
        // fresh checkout: buyers can re-subscribe before the period ends.
        when(payPalClient.createSubscription(eq("plan-startup-1"), eq(String.valueOf(session.organizationId())),
                anyString(), anyString())).thenReturn("I-TEST0008");
        when(payPalClient.getSubscription("I-TEST0008")).thenReturn(new PayPalClient.SubscriptionInfo(
                "I-TEST0008", "plan-startup-1", String.valueOf(session.organizationId()),
                "APPROVAL_PENDING", null, null, null));
        mockMvc.perform(post("/v1/billing/checkout")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\":\"STARTUP\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.subscription_id").value("I-TEST0008"))
                .andExpect(jsonPath("$.data.status").value("APPROVAL_PENDING"));
    }

    // ── Webhooks ────────────────────────────────────────────────────────────

    @Test
    void webhookActivationAppliesPlanAndIsIdempotent() throws Exception {
        Session session = register();
        startPendingCheckout(session, "I-TEST0004");
        when(payPalClient.verifyWebhookSignature(anyMap(), any(JsonNode.class))).thenReturn(true);

        String payload = subscriptionEvent("WH-ACT-1", "BILLING.SUBSCRIPTION.ACTIVATED",
                "I-TEST0004", session.organizationId(), "ACTIVE", "plan-dev-1");
        mockMvc.perform(post("/v1/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.event_id").value("WH-ACT-1"))
                .andExpect(jsonPath("$.data.duplicate").value(false));

        mockMvc.perform(get("/v1/billing").header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken())))
                .andExpect(jsonPath("$.data.plan").value("DEVELOPER"))
                .andExpect(jsonPath("$.data.subscription.status").value("ACTIVE"));

        // PayPal retries deliveries: the same event id must not double-apply.
        mockMvc.perform(post("/v1/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.duplicate").value(true));
    }

    @Test
    void webhookExpiryDowngradesPlanAndKeys() throws Exception {
        Session session = register();
        createApiKey(session.accessToken(), "billing-expiry");
        startPendingCheckout(session, "I-TEST0005");
        when(payPalClient.verifyWebhookSignature(anyMap(), any(JsonNode.class))).thenReturn(true);

        sendWebhook(subscriptionEvent("WH-EXP-1", "BILLING.SUBSCRIPTION.ACTIVATED",
                "I-TEST0005", session.organizationId(), "ACTIVE", "plan-dev-1"));
        mockMvc.perform(get("/v1/api-keys").header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken())))
                .andExpect(jsonPath("$.data[0].plan").value("DEVELOPER"));

        sendWebhook(subscriptionEvent("WH-EXP-2", "BILLING.SUBSCRIPTION.EXPIRED",
                "I-TEST0005", session.organizationId(), "EXPIRED", "plan-dev-1"));

        mockMvc.perform(get("/v1/billing").header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken())))
                .andExpect(jsonPath("$.data.plan").value("FREE"))
                .andExpect(jsonPath("$.data.subscription.status").value("EXPIRED"));
        mockMvc.perform(get("/v1/api-keys").header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken())))
                .andExpect(jsonPath("$.data[0].plan").value("FREE"));
    }

    @Test
    void webhookRejectsUnverifiedSignature() throws Exception {
        when(payPalClient.verifyWebhookSignature(anyMap(), any(JsonNode.class))).thenReturn(false);

        mockMvc.perform(post("/v1/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(subscriptionEvent("WH-BAD-1", "BILLING.SUBSCRIPTION.ACTIVATED",
                                "I-TEST0099", 1L, "ACTIVE", "plan-dev-1")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_WEBHOOK_SIGNATURE"));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Registers an account and returns its OWNER session. */
    private Session register() throws Exception {
        String email = "billing-" + Long.toString(System.nanoTime(), 36) + "@fincode.test";
        MvcResult result = mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"name\":\"Billing\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String body = json(result);
        return new Session(
                stringAt(body, "$.data.tokens.access_token"),
                longAt(body, "$.data.organization.id"));
    }

    private void createApiKey(String accessToken, String name) throws Exception {
        mockMvc.perform(post("/v1/api-keys")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"live\":false}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.api_key.plan").value("FREE"));
    }

    /** Creates an approval-pending subscription for the organization. */
    private void startPendingCheckout(Session session, String subscriptionId) throws Exception {
        when(payPalClient.createSubscription(eq("plan-dev-1"), eq(String.valueOf(session.organizationId())),
                anyString(), anyString())).thenReturn(subscriptionId);
        when(payPalClient.getSubscription(subscriptionId)).thenReturn(new PayPalClient.SubscriptionInfo(
                subscriptionId, "plan-dev-1", String.valueOf(session.organizationId()),
                "APPROVAL_PENDING", null, null, null));
        mockMvc.perform(post("/v1/billing/checkout")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\":\"DEVELOPER\"}"))
                .andExpect(status().isCreated());
    }

    /** Checkout plus confirmation: the organization is DEVELOPER afterwards. */
    private void activateSubscription(Session session, String subscriptionId) throws Exception {
        startPendingCheckout(session, subscriptionId);
        when(payPalClient.getSubscription(subscriptionId)).thenReturn(new PayPalClient.SubscriptionInfo(
                subscriptionId, "plan-dev-1", String.valueOf(session.organizationId()),
                "ACTIVE", "PAYER-ACTIVE", Instant.now(), Instant.now().plus(Duration.ofDays(30))));
        mockMvc.perform(post("/v1/billing/subscriptions/" + subscriptionId + "/confirm")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("DEVELOPER"));
    }

    private void sendWebhook(String payload) throws Exception {
        mockMvc.perform(post("/v1/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    private static String subscriptionEvent(String eventId, String eventType, String subscriptionId,
                                            long organizationId, String status, String planId) {
        return "{\"id\":\"" + eventId + "\",\"event_type\":\"" + eventType + "\","
                + "\"resource\":{\"id\":\"" + subscriptionId + "\","
                + "\"custom_id\":\"" + organizationId + "\","
                + "\"plan_id\":\"" + planId + "\","
                + "\"status\":\"" + status + "\","
                + "\"subscriber\":{\"payer_id\":\"PAYER-WEBHOOK\"},"
                + "\"start_time\":\"2026-09-01T00:00:00Z\","
                + "\"billing_info\":{\"next_billing_time\":\"2027-09-01T00:00:00Z\"}}}";
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String json(MvcResult result) throws Exception {
        return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private static String stringAt(String body, String path) {
        return JsonPath.read(body, path);
    }

    private static long longAt(String body, String path) {
        return ((Number) JsonPath.read(body, path)).longValue();
    }

    private record Session(String accessToken, long organizationId) {
    }
}
