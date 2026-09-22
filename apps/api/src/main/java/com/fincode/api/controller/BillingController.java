package com.fincode.api.controller;

import com.fincode.api.application.service.AuthPrincipal;
import com.fincode.api.application.service.BillingService;
import com.fincode.api.config.JwtAuthFilter;
import com.fincode.api.domain.enums.OrganizationRole;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.BillingDtos.BillingSummaryData;
import com.fincode.api.dto.BillingDtos.CancelRequest;
import com.fincode.api.dto.BillingDtos.CheckoutData;
import com.fincode.api.dto.BillingDtos.CheckoutRequest;
import com.fincode.api.dto.BillingDtos.InvoiceData;
import com.fincode.api.dto.BillingDtos.ReviseData;
import com.fincode.api.dto.BillingDtos.ReviseRequest;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Subscription billing for the developer portal (FIN-019), JWT authenticated
 * and scoped to the organization of the access token. Following the role model
 * of FIN-004, only the OWNER manages billing; other roles have read access.
 */
@RestController
@RequestMapping("/v1/billing")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping
    public ApiResponse<BillingSummaryData> summary(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal) {
        return ApiResponse.of(billingService.summary(requireOrganization(principal)));
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CheckoutData> checkout(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
            @Valid @RequestBody CheckoutRequest request) {
        requireBillingManager(principal);
        return ApiResponse.of(billingService.startCheckout(requireOrganization(principal), request.plan()));
    }

    @PostMapping("/subscriptions/{subscriptionId}/confirm")
    public ApiResponse<BillingSummaryData> confirm(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
            @PathVariable String subscriptionId) {
        requireBillingManager(principal);
        return ApiResponse.of(billingService.confirm(requireOrganization(principal), subscriptionId));
    }

    @PostMapping("/subscriptions/{subscriptionId}/revise")
    public ApiResponse<ReviseData> revise(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
            @PathVariable String subscriptionId,
            @Valid @RequestBody ReviseRequest request) {
        requireBillingManager(principal);
        return ApiResponse.of(billingService.revise(requireOrganization(principal), subscriptionId, request.plan()));
    }

    @PostMapping("/subscriptions/{subscriptionId}/cancel")
    public ApiResponse<BillingSummaryData> cancel(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
            @PathVariable String subscriptionId,
            @RequestBody(required = false) CancelRequest request) {
        requireBillingManager(principal);
        String reason = request == null ? null : request.reason();
        return ApiResponse.of(billingService.cancel(requireOrganization(principal), subscriptionId, reason));
    }

    @GetMapping("/invoices")
    public ApiResponse<InvoiceData> invoices(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
            @RequestParam(name = "subscription_id", required = false) String subscriptionId) {
        if (subscriptionId == null || subscriptionId.isBlank()) {
            throw new ApiException(ErrorCode.MISSING_PARAMETER, "Missing required parameter: subscription_id");
        }
        return ApiResponse.of(billingService.invoices(requireOrganization(principal), subscriptionId));
    }

    private Long requireOrganization(AuthPrincipal principal) {
        if (principal.organizationId() == null) {
            throw new ApiException(ErrorCode.FORBIDDEN, "The account has no active organization");
        }
        return principal.organizationId();
    }

    private static void requireBillingManager(AuthPrincipal principal) {
        if (principal.role() != OrganizationRole.OWNER) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Only the organization owner can manage billing");
        }
    }
}
