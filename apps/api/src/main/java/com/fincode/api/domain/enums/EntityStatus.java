package com.fincode.api.domain.enums;

/**
 * Generic lifecycle status shared by core entities (spec §12-16).
 */
public enum EntityStatus {
    ACTIVE,
    INACTIVE,
    SUSPENDED,
    MERGED,
    CLOSED
}
