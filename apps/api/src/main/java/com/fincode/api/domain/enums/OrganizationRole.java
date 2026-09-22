package com.fincode.api.domain.enums;

/**
 * Organization membership roles (FIN-004). Permissions are derived from the
 * role: OWNER manages billing, members and keys; ADMIN manages members and
 * keys; MEMBER has read access only.
 */
public enum OrganizationRole {
    OWNER,
    ADMIN,
    MEMBER;

    public boolean canManageMembers() {
        return this == OWNER || this == ADMIN;
    }

    public boolean canChangeRoles() {
        return this == OWNER;
    }
}
