package com.fincode.api.dto;

import java.util.List;

/**
 * Universal lookup payload (spec §29, FIN-011).
 */
public final class LookupDtos {

    private LookupDtos() {
    }

    public record LookupBank(String id, String nameEn, String country) {
    }

    public record LookupIdentifier(String type, String value, LookupBank bank) {
    }

    /** Closest candidate when the type cannot be detected or resolved. */
    public record LookupSuggestion(String type, String value, String name, String country) {
    }

    public record LookupData(String query, String detectedType, boolean resolved, LookupIdentifier identifier,
                             List<LookupSuggestion> suggestions) {
    }
}
