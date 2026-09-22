package com.fincode.api.domain.enums;

/**
 * Dataset publication lifecycle (spec §19).
 */
public enum DataVersionStatus {
    DRAFT,
    VALIDATING,
    READY,
    PUBLISHED,
    ROLLED_BACK
}
