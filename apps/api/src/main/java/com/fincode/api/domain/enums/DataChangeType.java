package com.fincode.api.domain.enums;

/**
 * Change record types for the audit trail (spec §20).
 */
public enum DataChangeType {
    NEW,
    UPDATED,
    REMOVED,
    REACTIVATED
}
