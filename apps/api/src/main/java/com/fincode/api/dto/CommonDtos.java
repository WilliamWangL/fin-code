package com.fincode.api.dto;

import java.time.LocalDate;

/**
 * Shared response fragments used across identifier, bank and country payloads.
 */
public final class CommonDtos {

    private CommonDtos() {
    }

    /** Compact institution summary embedded in identifier responses. */
    public record BankSummary(String id, String nameEn, String nameLocal, String shortName, String country, String website) {
    }

    /** Data provenance block attached to resolved records (spec §2.6). */
    public record SourceInfo(String name, String sourceType, LocalDate retrievedAt) {
    }

    /** 1-based position within the IBAN, e.g. {start: 5, length: 8}. */
    public record Position(int start, int length) {
    }

    public record IdentifierRef(String type, String value) {
    }
}
