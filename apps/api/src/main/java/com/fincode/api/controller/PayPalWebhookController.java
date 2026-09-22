package com.fincode.api.controller;

import com.fincode.api.application.service.BillingService;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.BillingDtos.WebhookAck;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * PayPal webhook receiver (FIN-019). The path is listed in
 * {@code ApiScopes} as public: neither the API key filter nor the portal JWT
 * filter applies, authenticity is proven by PayPal's signature verification
 * performed in {@link BillingService#handleWebhook}.
 */
@RestController
public class PayPalWebhookController {

    private static final String HEADER_AUTH_ALGO = "paypal-auth-algo";
    private static final String HEADER_CERT_URL = "paypal-cert-url";
    private static final String HEADER_TRANSMISSION_ID = "paypal-transmission-id";
    private static final String HEADER_TRANSMISSION_SIG = "paypal-transmission-sig";
    private static final String HEADER_TRANSMISSION_TIME = "paypal-transmission-time";

    private final BillingService billingService;

    public PayPalWebhookController(BillingService billingService) {
        this.billingService = billingService;
    }

    @PostMapping(path = "/v1/webhooks/paypal", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<WebhookAck> receive(@RequestBody String rawBody, HttpServletRequest request) {
        Map<String, String> headers = new HashMap<>();
        headers.put(HEADER_AUTH_ALGO, request.getHeader("PAYPAL-AUTH-ALGO"));
        headers.put(HEADER_CERT_URL, request.getHeader("PAYPAL-CERT-URL"));
        headers.put(HEADER_TRANSMISSION_ID, request.getHeader("PAYPAL-TRANSMISSION-ID"));
        headers.put(HEADER_TRANSMISSION_SIG, request.getHeader("PAYPAL-TRANSMISSION-SIG"));
        headers.put(HEADER_TRANSMISSION_TIME, request.getHeader("PAYPAL-TRANSMISSION-TIME"));
        return ApiResponse.of(billingService.handleWebhook(headers, rawBody));
    }
}
