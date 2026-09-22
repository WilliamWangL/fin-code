package com.fincode.api.controller;

import com.fincode.api.application.service.ApiKeyService;
import com.fincode.api.application.service.AuthPrincipal;
import com.fincode.api.config.JwtAuthFilter;
import com.fincode.api.domain.enums.Plan;
import com.fincode.api.domain.model.Organization;
import com.fincode.api.domain.repository.OrganizationRepository;
import com.fincode.api.dto.ApiKeyDtos.ApiKeyCreatedData;
import com.fincode.api.dto.ApiKeyDtos.ApiKeyData;
import com.fincode.api.dto.ApiKeyDtos.CreateApiKeyRequest;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import com.fincode.api.mapper.AccountMapper;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * API key management for the developer portal (FIN-014), JWT authenticated and
 * scoped to the organization of the access token. The plaintext key is only
 * returned by create and rotate.
 */
@RestController
@RequestMapping("/v1/api-keys")
public class ApiKeysController {

    private final ApiKeyService apiKeyService;
    private final OrganizationRepository organizationRepository;

    public ApiKeysController(ApiKeyService apiKeyService, OrganizationRepository organizationRepository) {
        this.apiKeyService = apiKeyService;
        this.organizationRepository = organizationRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ApiKeyCreatedData> create(@RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
                                                 @Valid @RequestBody CreateApiKeyRequest request) {
        Long organizationId = requireOrganization(principal);
        Plan plan = organizationRepository.findById(organizationId)
                .map(Organization::getPlan)
                .orElse(Plan.FREE);
        ApiKeyService.CreatedKey created = apiKeyService.create(request.name(),
                Boolean.TRUE.equals(request.live()), plan, organizationId);
        return ApiResponse.of(AccountMapper.toApiKeyCreatedData(created.apiKey(), created.rawKey()));
    }

    @GetMapping
    public ApiResponse<List<ApiKeyData>> list(@RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal) {
        List<ApiKeyData> keys = apiKeyService.listForOrganization(requireOrganization(principal)).stream()
                .map(AccountMapper::toApiKeyData)
                .toList();
        return ApiResponse.of(keys);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<ApiKeyData> revoke(@PathVariable Long id,
                                          @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal) {
        return ApiResponse.of(AccountMapper.toApiKeyData(apiKeyService.revoke(id, requireOrganization(principal))));
    }

    @PostMapping("/{id}/rotate")
    public ApiResponse<ApiKeyCreatedData> rotate(@PathVariable Long id,
                                                 @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal) {
        ApiKeyService.CreatedKey created = apiKeyService.rotate(id, requireOrganization(principal));
        return ApiResponse.of(AccountMapper.toApiKeyCreatedData(created.apiKey(), created.rawKey()));
    }

    private Long requireOrganization(AuthPrincipal principal) {
        if (principal.organizationId() == null) {
            throw new ApiException(ErrorCode.FORBIDDEN, "The account has no active organization");
        }
        return principal.organizationId();
    }
}
