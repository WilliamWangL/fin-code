package com.fincode.api.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fincode.api.config.PayPalProperties;
import java.net.URI;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/**
 * Guards the parameter encoding of the PayPal REST client: pre-encoded query
 * values must not be encoded a second time. PayPal answers %3A arriving as
 * %253A with INVALID_PARAMETER_SYNTAX, which broke the invoices endpoint (502).
 */
class PayPalRestClientTest {

    @Test
    void transactionQueryIsEncodedExactlyOnce() {
        PayPalProperties properties = new PayPalProperties();
        properties.setClientId("client-id");
        properties.setClientSecret("client-secret");

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        PayPalRestClient client = new PayPalRestClient(properties, builder);

        server.expect(requestTo("https://api-m.sandbox.paypal.com/v1/oauth2/token"))
                .andRespond(withSuccess(
                        "{\"access_token\":\"token\",\"expires_in\":3600}", MediaType.APPLICATION_JSON));

        AtomicReference<URI> requested = new AtomicReference<>();
        server.expect(request -> requested.set(request.getURI()))
                .andRespond(withSuccess("{\"transactions\":[]}", MediaType.APPLICATION_JSON));

        client.listTransactions(
                "I-TEST0001",
                Instant.parse("2026-08-24T08:05:21.987654Z"),
                Instant.parse("2026-09-24T08:05:21.987654Z"));

        URI uri = requested.get();
        assertThat(uri.getPath()).isEqualTo("/v1/billing/subscriptions/I-TEST0001/transactions");
        assertThat(uri.getQuery())
                .contains("start_time=2026-08-24T08:05:21Z")
                .contains("end_time=2026-09-24T08:05:21Z");
        assertThat(uri.getRawQuery()).doesNotContain("%25");
        server.verify();
    }
}
