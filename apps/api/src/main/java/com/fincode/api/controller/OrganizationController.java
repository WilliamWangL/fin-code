package com.fincode.api.controller;

import com.fincode.api.application.service.AuthPrincipal;
import com.fincode.api.application.service.OrganizationService;
import com.fincode.api.config.JwtAuthFilter;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.OrganizationDtos.AddMemberRequest;
import com.fincode.api.dto.OrganizationDtos.MemberData;
import com.fincode.api.dto.OrganizationDtos.OrganizationData;
import com.fincode.api.dto.OrganizationDtos.RemoveMemberData;
import com.fincode.api.dto.OrganizationDtos.UpdateMemberRoleRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Organization and membership endpoints (FIN-004), JWT authenticated.
 */
@RestController
@RequestMapping("/v1/organizations")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping
    public ApiResponse<List<OrganizationData>> list(@RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal) {
        return ApiResponse.of(organizationService.listMine(principal.userId()));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrganizationData> get(@PathVariable Long id,
                                             @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal) {
        return ApiResponse.of(organizationService.get(id, principal.userId()));
    }

    @GetMapping("/{id}/members")
    public ApiResponse<List<MemberData>> members(@PathVariable Long id,
                                                 @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal) {
        return ApiResponse.of(organizationService.members(id, principal.userId()));
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MemberData> addMember(@PathVariable Long id,
                                             @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
                                             @Valid @RequestBody AddMemberRequest request) {
        return ApiResponse.of(organizationService.addMember(id, principal, request.email(), request.role()));
    }

    @PatchMapping("/{id}/members/{memberId}")
    public ApiResponse<MemberData> updateMemberRole(@PathVariable Long id,
                                                    @PathVariable Long memberId,
                                                    @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
                                                    @Valid @RequestBody UpdateMemberRoleRequest request) {
        return ApiResponse.of(organizationService.updateMemberRole(id, memberId, principal, request.role()));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ApiResponse<RemoveMemberData> removeMember(@PathVariable Long id,
                                                      @PathVariable Long memberId,
                                                      @RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal) {
        organizationService.removeMember(id, memberId, principal);
        return ApiResponse.of(new RemoveMemberData(true));
    }
}
