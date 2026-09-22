package com.fincode.api.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fincode.api.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * CORS contract for the developer portal (FIN-017): the website calls the API
 * from the browser, so preflight requests must be answered before the
 * authentication filters and browser-visible errors must carry the required
 * headers. The allowed origin mirrors {@code fincode.cors.allowed-origins}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CorsContractTest {

    private static final String ALLOWED_ORIGIN = "http://localhost:3000";

    private static final String FORBIDDEN_ORIGIN = "https://evil.example.com";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void preflightFromAllowedOriginIsAccepted() throws Exception {
        mockMvc.perform(preflight("/v1/auth/login", ALLOWED_ORIGIN, HttpMethod.POST, HttpHeaders.AUTHORIZATION,
                        HttpHeaders.CONTENT_TYPE))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ALLOWED_ORIGIN))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, containsString("POST")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString("Authorization")));
    }

    @Test
    void preflightFromUnknownOriginIsRejected() throws Exception {
        mockMvc.perform(preflight("/v1/auth/login", FORBIDDEN_ORIGIN, HttpMethod.POST, HttpHeaders.AUTHORIZATION))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    void actualRequestCarriesCorsHeadersEvenWhenUnauthorized() throws Exception {
        // Without a token the endpoint answers 401, but the browser must still
        // be able to read the response (and the request ID) from another origin.
        mockMvc.perform(get("/v1/usage").header(HttpHeaders.ORIGIN, ALLOWED_ORIGIN))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ALLOWED_ORIGIN))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS,
                        containsString("X-Request-Id")));
    }

    @Test
    void requestWithoutOriginHasNoCorsHeaders() throws Exception {
        mockMvc.perform(get("/v1/usage"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    private MockHttpServletRequestBuilder preflight(String path, String origin, HttpMethod method,
                                                    String... requestedHeaders) {
        MockHttpServletRequestBuilder builder = options(path)
                .header(HttpHeaders.ORIGIN, origin)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, method.name());
        if (requestedHeaders.length > 0) {
            builder = builder.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, String.join(",", requestedHeaders));
        }
        return builder;
    }
}
