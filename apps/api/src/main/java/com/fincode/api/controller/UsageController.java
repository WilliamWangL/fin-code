package com.fincode.api.controller;

import com.fincode.api.application.service.AuthPrincipal;
import com.fincode.api.application.service.UsageQueryService;
import com.fincode.api.config.JwtAuthFilter;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.UsageDtos.ApiKeyUsageData;
import com.fincode.api.dto.UsageDtos.DailyUsageData;
import com.fincode.api.dto.UsageDtos.EndpointUsageData;
import com.fincode.api.dto.UsageDtos.UsageSummaryData;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Usage reports for the developer portal (FIN-015), JWT authenticated and
 * scoped to the organization of the access token. Windows are UTC dates.
 */
@RestController
@RequestMapping("/v1/usage")
public class UsageController {

    private final UsageQueryService usageQueryService;

    public UsageController(UsageQueryService usageQueryService) {
        this.usageQueryService = usageQueryService;
    }

    @GetMapping
    public ApiResponse<UsageSummaryData> summary(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.of(usageQueryService.summary(requireOrganization(principal), from, to));
    }

    @GetMapping("/endpoints")
    public ApiResponse<List<EndpointUsageData>> endpoints(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.of(usageQueryService.byEndpoint(requireOrganization(principal), from, to));
    }

    @GetMapping("/daily")
    public ApiResponse<List<DailyUsageData>> daily(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.of(usageQueryService.byDay(requireOrganization(principal), from, to));
    }

    @GetMapping("/keys")
    public ApiResponse<List<ApiKeyUsageData>> keys(
            @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.of(usageQueryService.byApiKey(requireOrganization(principal), from, to));
    }

    private Long requireOrganization(AuthPrincipal principal) {
        if (principal.organizationId() == null) {
            throw new ApiException(ErrorCode.FORBIDDEN, "The account has no active organization");
        }
        return principal.organizationId();
    }
}
