package com.fincode.api.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fincode.api.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Billing contract without PayPal credentials (FIN-019): the portal must
 * degrade cleanly - the plan catalog reports no checkout, mutations return
 * BILLING_UNAVAILABLE (503) and the webhook path answers 503 instead of
 * falling through to the authentication filters.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BillingDisabledContractTest {

    private static final String PASSWORD = "secret-pass-123";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void summaryReportsUnconfiguredProvider() throws Exception {
        String accessToken = register();
        mockMvc.perform(get("/v1/billing").header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("FREE"))
                .andExpect(jsonPath("$.data.provider.configured").value(false))
                .andExpect(jsonPath("$.data.plans", hasSize(3)))
                .andExpect(jsonPath("$.data.plans[0].checkout_available").value(false));
    }

    @Test
    void checkoutReturns503WhenUnconfigured() throws Exception {
        String accessToken = register();
        mockMvc.perform(post("/v1/billing/checkout")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\":\"DEVELOPER\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("BILLING_UNAVAILABLE"));
    }

    @Test
    void webhookBypassesAuthenticationAndReturns503() throws Exception {
        mockMvc.perform(post("/v1/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"WH-DISABLED-1\",\"event_type\":\"BILLING.SUBSCRIPTION.ACTIVATED\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("BILLING_UNAVAILABLE"));
    }

    private String register() throws Exception {
        String email = "billing-off-" + Long.toString(System.nanoTime(), 36) + "@fincode.test";
        MvcResult result = mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"name\":\"Billing\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        return JsonPath.read(body, "$.data.tokens.access_token");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
