package com.fincode.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fincode.api.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Contract tests for the developer portal (FIN-003, FIN-004, FIN-014) over the
 * real filter chain: registration, JWT login/refresh/logout, password reset,
 * organization membership roles and API key management, including the
 * boundary between portal JWTs and data API keys.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AccountContractTest {

    private static final String PASSWORD = "secret-pass-123";

    @Autowired
    private MockMvc mockMvc;

    private String suffix;
    private String ownerEmail;
    private String memberEmail;
    private String outsiderEmail;
    private String reseterEmail;
    private String ownerAccess;
    private Long ownerOrganizationId;

    @BeforeAll
    void registerAccounts() throws Exception {
        suffix = Long.toString(System.nanoTime(), 36);
        ownerEmail = "owner-" + suffix + "@fincode.test";
        memberEmail = "member-" + suffix + "@fincode.test";
        outsiderEmail = "outsider-" + suffix + "@fincode.test";
        reseterEmail = "reseter-" + suffix + "@fincode.test";

        String body = json(register(ownerEmail, "Owner"));
        ownerOrganizationId = longAt(body, "$.data.organization.id");
        ownerAccess = stringAt(body, "$.data.tokens.access_token");

        register(memberEmail, "Member");
        register(outsiderEmail, "Outsider");
        register(reseterEmail, "Reseter");
    }

    // ── Registration ────────────────────────────────────────────────────────

    @Test
    void registerCreatesAccountOrganizationAndTokens() throws Exception {
        String email = "fresh-" + suffix + "@fincode.test";
        MvcResult result = mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, "Fresh Dev")))
                .andExpect(status().isCreated())
                .andExpect(header().exists("X-Request-Id"))
                .andExpect(jsonPath("$.data.user.email").value(email))
                .andExpect(jsonPath("$.data.user.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.user.email_verified").value(false))
                .andExpect(jsonPath("$.data.organization.name").value("Fresh Dev's Organization"))
                .andExpect(jsonPath("$.data.organization.slug", startsWith("org-")))
                .andExpect(jsonPath("$.data.organization.plan").value("FREE"))
                .andExpect(jsonPath("$.data.organization.role").value("OWNER"))
                .andExpect(jsonPath("$.data.tokens.access_token", notNullValue()))
                .andExpect(jsonPath("$.data.tokens.refresh_token", notNullValue()))
                .andExpect(jsonPath("$.data.tokens.token_type").value("Bearer"))
                .andExpect(jsonPath("$.data.tokens.expires_in").value(900))
                .andExpect(jsonPath("$.meta.request_id", startsWith("req_")))
                .andReturn();

        String body = json(result);
        assertThat(longAt(body, "$.data.user.id")).isPositive();
    }

    @Test
    void registerRejectsDuplicateEmail() throws Exception {
        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(ownerEmail, "Impostor")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.error.request_id", startsWith("req_")));
    }

    @Test
    void registerValidatesInput() throws Exception {
        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"short-" + suffix + "@fincode.test\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
    }

    // ── Login, refresh and logout ───────────────────────────────────────────

    @Test
    void loginSucceedsAndRejectsWrongCredentials() throws Exception {
        String[] tokens = login(ownerEmail, PASSWORD);
        assertThat(tokens[0]).isNotBlank();
        assertThat(tokens[1]).isNotBlank();

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(ownerEmail, "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("nobody-" + suffix + "@fincode.test", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void meReturnsProfileAndOrganizations() throws Exception {
        mockMvc.perform(get("/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));

        mockMvc.perform(get("/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.email").value(ownerEmail))
                .andExpect(jsonPath("$.data.organizations", hasSize(1)))
                .andExpect(jsonPath("$.data.organizations[0].id").value(ownerOrganizationId.intValue()))
                .andExpect(jsonPath("$.data.organizations[0].role").value("OWNER"));
    }

    @Test
    void refreshRotatesTokensAndRejectsReuse() throws Exception {
        String[] tokens = login(ownerEmail, PASSWORD);

        MvcResult refreshed = mockMvc.perform(post("/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refresh_token\":\"" + tokens[1] + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.access_token", notNullValue()))
                .andExpect(jsonPath("$.data.refresh_token", notNullValue()))
                .andExpect(jsonPath("$.data.expires_in").value(900))
                .andReturn();

        String newAccess = stringAt(json(refreshed), "$.data.access_token");
        String newRefresh = stringAt(json(refreshed), "$.data.refresh_token");
        assertThat(newRefresh).isNotEqualTo(tokens[1]);

        // The rotated access token is immediately usable.
        mockMvc.perform(get("/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(newAccess)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.email").value(ownerEmail));

        mockMvc.perform(post("/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refresh_token\":\"" + tokens[1] + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_EXPIRED"));
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        String[] tokens = login(memberEmail, PASSWORD);

        mockMvc.perform(post("/v1/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokens[0]))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refresh_token\":\"" + tokens[1] + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.logged_out").value(true));

        mockMvc.perform(post("/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refresh_token\":\"" + tokens[1] + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_EXPIRED"));
    }

    // ── Password reset ──────────────────────────────────────────────────────

    @Test
    void passwordResetFlowUpdatesPasswordAndRevokesSessions() throws Exception {
        String[] session = login(reseterEmail, PASSWORD);

        MvcResult requested = mockMvc.perform(post("/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + reseterEmail + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reset_token", notNullValue()))
                .andReturn();
        String resetToken = stringAt(json(requested), "$.data.reset_token");

        mockMvc.perform(post("/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + resetToken + "\",\"new_password\":\"brand-new-pass-456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.password_updated").value(true));

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(reseterEmail, PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));

        login(reseterEmail, "brand-new-pass-456");

        mockMvc.perform(post("/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refresh_token\":\"" + session[1] + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_EXPIRED"));

        mockMvc.perform(post("/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + resetToken + "\",\"new_password\":\"another-pass-789\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_EXPIRED"));
    }

    @Test
    void unknownResetRequestDoesNotRevealAccounts() throws Exception {
        mockMvc.perform(post("/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ghost-" + suffix + "@fincode.test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reset_token").doesNotExist());
    }

    // ── Organizations and members ───────────────────────────────────────────

    @Test
    void organizationMemberLifecycleEnforcesRoles() throws Exception {
        String memberAccess = accessToken(memberEmail);
        String outsiderAccess = accessToken(outsiderEmail);

        mockMvc.perform(get("/v1/organizations").header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value(ownerOrganizationId.intValue()))
                .andExpect(jsonPath("$.data[0].role").value("OWNER"));

        MvcResult added = mockMvc.perform(post("/v1/organizations/" + ownerOrganizationId + "/members")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + memberEmail + "\",\"role\":\"MEMBER\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value(memberEmail))
                .andExpect(jsonPath("$.data.role").value("MEMBER"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andReturn();
        Long memberRecordId = longAt(json(added), "$.data.id");

        mockMvc.perform(post("/v1/organizations/" + ownerOrganizationId + "/members")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + memberEmail + "\",\"role\":\"MEMBER\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("MEMBER_ALREADY_EXISTS"));

        mockMvc.perform(post("/v1/organizations/" + ownerOrganizationId + "/members")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ghost-" + suffix + "@fincode.test\",\"role\":\"MEMBER\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));

        // A MEMBER can read the organization but cannot manage members or roles.
        mockMvc.perform(get("/v1/organizations/" + ownerOrganizationId + "/members")
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberAccess)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
        mockMvc.perform(get("/v1/organizations/" + ownerOrganizationId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberAccess)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/v1/organizations/" + ownerOrganizationId + "/members")
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberAccess))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + outsiderEmail + "\",\"role\":\"MEMBER\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
        mockMvc.perform(patch("/v1/organizations/" + ownerOrganizationId + "/members/" + memberRecordId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberAccess))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));

        // Outsiders cannot see the organization at all.
        mockMvc.perform(get("/v1/organizations/" + ownerOrganizationId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(outsiderAccess)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));

        // The OWNER promotes the member; the OWNER role itself is never grantable.
        mockMvc.perform(patch("/v1/organizations/" + ownerOrganizationId + "/members/" + memberRecordId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("ADMIN"));

        mockMvc.perform(patch("/v1/organizations/" + ownerOrganizationId + "/members/" + memberRecordId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"OWNER\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));

        // Removal revokes access to the organization.
        mockMvc.perform(delete("/v1/organizations/" + ownerOrganizationId + "/members/" + memberRecordId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.removed").value(true));

        mockMvc.perform(get("/v1/organizations/" + ownerOrganizationId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(memberAccess)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    // ── API key management ──────────────────────────────────────────────────

    @Test
    void apiKeyLifecycleIsOrganizationScoped() throws Exception {
        MvcResult created = mockMvc.perform(post("/v1/api-keys")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"portal-key\",\"live\":false}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.api_key.name").value("portal-key"))
                .andExpect(jsonPath("$.data.api_key.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.api_key.plan").value("FREE"))
                .andExpect(jsonPath("$.data.api_key.organization_id").value(ownerOrganizationId.intValue()))
                .andExpect(jsonPath("$.data.key", startsWith("sk_test_")))
                .andReturn();

        String body = json(created);
        String rawKey = stringAt(body, "$.data.key");
        String keyPrefix = stringAt(body, "$.data.api_key.key_prefix");
        Long keyId = longAt(body, "$.data.api_key.id");
        assertThat(keyPrefix).isEqualTo(rawKey.substring(0, 12));

        // The new key authenticates against the data API immediately.
        dataApiProbe(rawKey).andExpect(status().isUnprocessableEntity());

        // Listing exposes metadata but never the plaintext key.
        MvcResult listed = mockMvc.perform(get("/v1/api-keys").header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess)))
                .andExpect(status().isOk())
                .andReturn();
        String listBody = json(listed);
        assertThat(listBody).contains(keyPrefix).doesNotContain(rawKey);

        // Rotation issues a replacement and retires the old key immediately.
        MvcResult rotated = mockMvc.perform(post("/v1/api-keys/" + keyId + "/rotate")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.key", startsWith("sk_test_")))
                .andReturn();
        String rotatedBody = json(rotated);
        String rotatedKey = stringAt(rotatedBody, "$.data.key");
        Long rotatedId = longAt(rotatedBody, "$.data.api_key.id");
        assertThat(rotatedKey).isNotEqualTo(rawKey);

        dataApiProbe(rawKey)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("API_KEY_EXPIRED"));
        dataApiProbe(rotatedKey).andExpect(status().isUnprocessableEntity());

        // Revocation is immediate and permanent.
        mockMvc.perform(delete("/v1/api-keys/" + rotatedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REVOKED"))
                .andExpect(jsonPath("$.data.revoked_at", notNullValue()));
        dataApiProbe(rotatedKey)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("API_KEY_EXPIRED"));

        // Keys are scoped to the organization of the JWT: outsiders get a 404.
        mockMvc.perform(delete("/v1/api-keys/" + rotatedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken(outsiderEmail))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void apiKeysAndJwtsDoNotCrossPathBoundaries() throws Exception {
        // A portal JWT is not a data API credential.
        mockMvc.perform(get("/v1/countries").header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));

        // A raw API key is not a portal credential.
        MvcResult created = mockMvc.perform(post("/v1/api-keys")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerAccess))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"boundary-key\",\"live\":false}"))
                .andExpect(status().isCreated())
                .andReturn();
        String rawKey = stringAt(json(created), "$.data.key");

        mockMvc.perform(get("/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(rawKey)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_EXPIRED"));
        mockMvc.perform(get("/v1/api-keys").header(HttpHeaders.AUTHORIZATION, bearer(rawKey)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_EXPIRED"));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Data API probe that authenticates an API key without touching the Redis
     * response cache. Deliberately avoids /v1/countries: that endpoint caches
     * its result, and probing it against the unseeded database of this class
     * would poison ApiContractTest when both share the cached context. A bad
     * IBAN checksum yields 422 once the key is accepted, in every seed state.
     */
    private ResultActions dataApiProbe(String apiKey) throws Exception {
        return mockMvc.perform(get("/v1/iban/validate")
                .param("iban", "DE89370400440532013001")
                .header(HttpHeaders.AUTHORIZATION, bearer(apiKey)));
    }

    private MvcResult register(String email, String name) throws Exception {
        return mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, name)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private String[] login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        String body = json(result);
        return new String[] {
                stringAt(body, "$.data.tokens.access_token"),
                stringAt(body, "$.data.tokens.refresh_token")
        };
    }

    private String accessToken(String email) throws Exception {
        return login(email, PASSWORD)[0];
    }

    private static String registerJson(String email, String name) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"name\":\"" + name + "\"}";
    }

    private static String loginJson(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
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
}
