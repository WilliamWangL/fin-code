package com.fincode.api.application.service;

import com.fincode.api.domain.enums.OrganizationRole;

/**
 * Authenticated developer account of the current request (FIN-003): the JWT
 * subject plus the organization and role active at login time.
 */
public record AuthPrincipal(Long userId, Long organizationId, OrganizationRole role) {
}
