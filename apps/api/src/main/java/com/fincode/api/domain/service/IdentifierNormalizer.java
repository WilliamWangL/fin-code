package com.fincode.api.domain.service;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Shared identifier normalization (spec §30): strips spaces and dashes, then
 * uppercases. Inputs like "DE89 3704 0044" or "20-00-00" become compact values.
 */
public final class IdentifierNormalizer {

    private static final Pattern SEPARATORS = Pattern.compile("[\\s\\-]+");

    private IdentifierNormalizer() {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        return SEPARATORS.matcher(raw.trim()).replaceAll("").toUpperCase(Locale.ROOT);
    }
}
