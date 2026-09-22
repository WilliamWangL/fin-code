package com.fincode.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fincode.api.TestcontainersConfiguration;
import com.fincode.api.application.service.ApiKeyService;
import com.fincode.api.domain.enums.Plan;
import com.fincode.api.domain.model.ApiKey;
import com.fincode.api.domain.model.RequestLog;
import com.fincode.api.domain.repository.RequestLogRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Contract tests for the usage reports (FIN-015): summary with quota, endpoint
 * breakdown, daily series and per-key totals, all organization scoped.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class UsageContractTest {

    private static final String PASSWORD = "secret-pass-123";
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApiKeyService apiKeyService;

    @Autowired
    private RequestLogRepository requestLogRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String suffix;
    private String accessA;
    private String accessB;
    private String accessC;
    private Long orgAId;
    private Long orgBId;
    private Long orgCId;
    private Long keyA1Id;
    private Long keyA2Id;
    private String keyC;
    private LocalDate today;
    private LocalDate prevMonthEnd;

    @BeforeAll
    void seedUsageData() throws Exception {
        suffix = Long.toString(System.nanoTime(), 36);
        today = LocalDate.now(ZoneOffset.UTC);
        prevMonthEnd = today.withDayOfMonth(1).minusDays(1);

        String[] ownerA = register("usage-a-" + suffix + "@fincode.test", "Usage A");
        orgAId = Long.valueOf(ownerA[0]);
        accessA = ownerA[1];
        String[] ownerB = register("usage-b-" + suffix + "@fincode.test", "Usage B");
        orgBId = Long.valueOf(ownerB[0]);
        accessB = ownerB[1];
        String[] ownerC = register("usage-c-" + suffix + "@fincode.test", "Usage C");
        orgCId = Long.valueOf(ownerC[0]);
        accessC = ownerC[1];

        ApiKey keyA1 = apiKeyService.create("usage-key-1", false, Plan.FREE, orgAId).apiKey();
        ApiKey keyA2 = apiKeyService.create("usage-key-2", false, Plan.FREE, orgAId).apiKey();
        keyA1Id = keyA1.getId();
        keyA2Id = keyA2.getId();
        keyC = apiKeyService.create("usage-key-c", false, Plan.FREE, orgCId).rawKey();

        LocalDateTime noonToday = today.atStartOfDay().plusHours(12);
        LocalDateTime noonPrevMonthEnd = prevMonthEnd.atStartOfDay().plusHours(12);
        for (int i = 0; i < 6; i++) {
            seed(orgAId, keyA1Id, "/v1/banks/{id}", 200, 40, noonToday);
        }
        for (int i = 0; i < 2; i++) {
            seed(orgAId, keyA1Id, "/v1/countries/{code}", 404, 60, noonToday);
        }
        for (int i = 0; i < 2; i++) {
            seed(orgAId, keyA2Id, "/v1/iban/validate", 200, 30, noonToday);
        }
        seed(orgAId, keyA2Id, "/v1/iban/validate", 200, 30, noonPrevMonthEnd);
        for (int i = 0; i < 2; i++) {
            seed(orgBId, null, "/v1/iban/validate", 200, 10, noonToday);
        }
        seed(orgBId, null, "/v1/banks/{id}", 500, 90, noonToday);
    }

    // ── Authentication ──────────────────────────────────────────────────────

    @Test
    void usageRequiresAPortalToken() throws Exception {
        mockMvc.perform(get("/v1/usage"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));

        // An API key is not a portal credential.
        mockMvc.perform(get("/v1/usage").header(HttpHeaders.AUTHORIZATION, bearer(keyC)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_EXPIRED"));

        mockMvc.perform(get("/v1/usage").header(HttpHeaders.AUTHORIZATION, bearer(accessA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.request_id", startsWith("req_")));
    }

    // ── Summary and quota ───────────────────────────────────────────────────

    @Test
    void summaryAggregatesTotalsQuotaAndWindow() throws Exception {
        mockMvc.perform(get("/v1/usage").header(HttpHeaders.AUTHORIZATION, bearer(accessA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.from").value(today.withDayOfMonth(1).toString()))
                .andExpect(jsonPath("$.data.to").value(today.toString()))
                .andExpect(jsonPath("$.data.request_count").value(10))
                .andExpect(jsonPath("$.data.error_count").value(2))
                .andExpect(jsonPath("$.data.error_rate").value(0.2))
                .andExpect(jsonPath("$.data.avg_latency_ms").value(42))
                .andExpect(jsonPath("$.data.max_latency_ms").value(60))
                .andExpect(jsonPath("$.data.quota.period").value(today.format(MONTH)))
                .andExpect(jsonPath("$.data.quota.plan").value("FREE"))
                .andExpect(jsonPath("$.data.quota.limit").value(500))
                .andExpect(jsonPath("$.data.quota.used").value(10))
                .andExpect(jsonPath("$.data.quota.remaining").value(490));

        // An explicit previous-month window returns only the historical row.
        mockMvc.perform(get("/v1/usage")
                        .param("from", today.withDayOfMonth(1).minusMonths(1).toString())
                        .param("to", prevMonthEnd.toString())
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.request_count").value(1))
                .andExpect(jsonPath("$.data.error_count").value(0))
                .andExpect(jsonPath("$.data.avg_latency_ms").value(30))
                .andExpect(jsonPath("$.data.quota.used").value(10));
    }

    @Test
    void invalidWindowsAreRejected() throws Exception {
        mockMvc.perform(get("/v1/usage")
                        .param("from", today.toString())
                        .param("to", today.minusDays(1).toString())
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessA)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));

        mockMvc.perform(get("/v1/usage")
                        .param("from", "not-a-date")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessA)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));

        mockMvc.perform(get("/v1/usage")
                        .param("from", today.minusDays(400).toString())
                        .param("to", today.toString())
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessA)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
    }

    // ── Breakdowns ──────────────────────────────────────────────────────────

    @Test
    void endpointBreakdownGroupsRoutes() throws Exception {
        mockMvc.perform(get("/v1/usage/endpoints").header(HttpHeaders.AUTHORIZATION, bearer(accessA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].endpoint").value("/v1/banks/{id}"))
                .andExpect(jsonPath("$.data[0].request_count").value(6))
                .andExpect(jsonPath("$.data[0].error_count").value(0))
                .andExpect(jsonPath("$.data[0].error_rate").value(0.0))
                .andExpect(jsonPath("$.data[0].avg_latency_ms").value(40))
                .andExpect(jsonPath("$.data[1].endpoint").value("/v1/countries/{code}"))
                .andExpect(jsonPath("$.data[1].request_count").value(2))
                .andExpect(jsonPath("$.data[1].error_count").value(2))
                .andExpect(jsonPath("$.data[1].error_rate").value(1.0))
                .andExpect(jsonPath("$.data[2].endpoint").value("/v1/iban/validate"))
                .andExpect(jsonPath("$.data[2].request_count").value(2))
                .andExpect(jsonPath("$.data[2].error_count").value(0))
                .andExpect(jsonPath("$.data[2].avg_latency_ms").value(30));
    }

    @Test
    void dailySeriesBucketsByUtcDay() throws Exception {
        mockMvc.perform(get("/v1/usage/daily").header(HttpHeaders.AUTHORIZATION, bearer(accessA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].date").value(today.toString()))
                .andExpect(jsonPath("$.data[0].request_count").value(10))
                .andExpect(jsonPath("$.data[0].error_count").value(2))
                .andExpect(jsonPath("$.data[0].avg_latency_ms").value(42));
    }

    @Test
    void keyBreakdownIsolatesKeys() throws Exception {
        MvcResult result = mockMvc.perform(get("/v1/usage/keys").header(HttpHeaders.AUTHORIZATION, bearer(accessA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andReturn();
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        List<Integer> ids = JsonPath.read(body, "$.data[*].api_key_id");
        List<Integer> counts = JsonPath.read(body, "$.data[*].request_count");
        List<Integer> errors = JsonPath.read(body, "$.data[*].error_count");
        assertThat(ids).containsExactly(keyA1Id.intValue(), keyA2Id.intValue());
        assertThat(counts).containsExactly(8, 2);
        assertThat(errors).containsExactly(2, 0);
        Number avgFirst = JsonPath.read(body, "$.data[0].avg_latency_ms");
        Number avgSecond = JsonPath.read(body, "$.data[1].avg_latency_ms");
        assertThat(avgFirst.intValue()).isEqualTo(45);
        assertThat(avgSecond.intValue()).isEqualTo(30);
    }

    // ── Scoping and live logging ────────────────────────────────────────────

    @Test
    void usageIsOrganizationScoped() throws Exception {
        mockMvc.perform(get("/v1/usage").header(HttpHeaders.AUTHORIZATION, bearer(accessB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.request_count").value(3))
                .andExpect(jsonPath("$.data.error_count").value(1))
                .andExpect(jsonPath("$.data.avg_latency_ms").value(37))
                .andExpect(jsonPath("$.data.quota.used").value(3));
    }

    @Test
    void liveRequestsAreLoggedWithNormalizedEndpoints() throws Exception {
        mockMvc.perform(get("/v1/countries/ZZ").header(HttpHeaders.AUTHORIZATION, bearer(keyC)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));

        // The live call is persisted under its route template, not the raw URI.
        List<String> endpoints = jdbcTemplate.queryForList(
                "SELECT endpoint FROM request_log WHERE organization_id = ?", String.class, orgCId);
        assertThat(endpoints).containsExactly("/v1/countries/{code}");

        mockMvc.perform(get("/v1/usage").header(HttpHeaders.AUTHORIZATION, bearer(accessC)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.request_count").value(1))
                .andExpect(jsonPath("$.data.error_count").value(1))
                .andExpect(jsonPath("$.data.error_rate").value(1.0))
                .andExpect(jsonPath("$.data.quota.used").value(1));

        mockMvc.perform(get("/v1/usage/endpoints").header(HttpHeaders.AUTHORIZATION, bearer(accessC)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].endpoint").value("/v1/countries/{code}"));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private String[] register(String email, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        return new String[] {
                String.valueOf(((Number) JsonPath.read(body, "$.data.organization.id")).longValue()),
                JsonPath.read(body, "$.data.tokens.access_token")
        };
    }

    private void seed(Long organizationId, Long apiKeyId, String endpoint,
                      int statusCode, int responseTimeMs, LocalDateTime requestDate) {
        RequestLog entry = new RequestLog();
        entry.setOrganizationId(organizationId);
        entry.setApiKeyId(apiKeyId);
        entry.setEndpoint(endpoint);
        entry.setMethod("GET");
        entry.setStatusCode(statusCode);
        entry.setResponseTime(responseTimeMs);
        entry.setRequestDate(requestDate);
        requestLogRepository.save(entry);
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
