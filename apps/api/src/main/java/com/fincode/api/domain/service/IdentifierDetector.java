package com.fincode.api.domain.service;

import com.fincode.api.domain.enums.IdentifierType;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Detects candidate identifier types from a free-form value (spec §29, FIN-011).
 * Order matters: IFSC before SWIFT (both are 11 characters) and six-digit
 * values yield both SORT_CODE and BSB candidates, resolved against the database
 * in order.
 */
public final class IdentifierDetector {

    private static final Pattern ALPHANUMERIC_PREFIX = Pattern.compile("^[A-Z]{2}\\d{2}[A-Z0-9]+$");
    private static final Pattern SIX_DIGITS = Pattern.compile("^\\d{6}$");

    private IdentifierDetector() {
    }

    /** Lightweight IBAN shape check: 2 letters, 2 digits, 15-34 characters. */
    public static boolean looksLikeIban(String normalized) {
        return normalized != null
                && normalized.length() >= 15
                && normalized.length() <= 34
                && ALPHANUMERIC_PREFIX.matcher(normalized).matches();
    }

    /** Ordered candidate types for a normalized value; empty when nothing matches. */
    public static List<IdentifierType> detect(String normalized) {
        if (normalized == null || normalized.length() < 6) {
            return List.of();
        }
        List<IdentifierType> candidates = new ArrayList<>(3);
        if (IdentifierFormatValidator.isValid(IdentifierType.IFSC, normalized)) {
            candidates.add(IdentifierType.IFSC);
        }
        if (SwiftValidator.isValid(normalized)) {
            candidates.add(IdentifierType.SWIFT);
        }
        if (IdentifierFormatValidator.isValid(IdentifierType.CNAPS, normalized)) {
            candidates.add(IdentifierType.CNAPS);
        }
        if (IdentifierFormatValidator.isValid(IdentifierType.ABA_ROUTING, normalized)) {
            candidates.add(IdentifierType.ABA_ROUTING);
        }
        if (SIX_DIGITS.matcher(normalized).matches()) {
            candidates.add(IdentifierType.SORT_CODE);
            candidates.add(IdentifierType.BSB);
        }
        return candidates;
    }
}
