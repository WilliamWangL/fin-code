package com.fincode.api.domain.enums;

/**
 * Bank identifier types (spec §15).
 */
public enum IdentifierType {
    SWIFT,
    BIC,
    ABA_ROUTING,
    SORT_CODE,
    BSB,
    IFSC,
    CNAPS,
    BANK_CODE,
    CLEARING_CODE,
    TRANSIT_NUMBER,
    INSTITUTION_CODE
}
