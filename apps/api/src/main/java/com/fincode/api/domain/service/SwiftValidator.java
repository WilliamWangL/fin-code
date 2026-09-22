package com.fincode.api.domain.service;

import java.util.regex.Pattern;

/**
 * SWIFT/BIC validation (spec §32, ISO 9362): 4 letters institution code,
 * 2 letters country code, 2 alphanumeric location code and an optional
 * 3-character branch code.
 */
public final class SwiftValidator {

    private static final Pattern PATTERN = Pattern.compile("^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$");

    private SwiftValidator() {
    }

    public static String normalize(String raw) {
        return IdentifierNormalizer.normalize(raw);
    }

    public static boolean isValid(String normalized) {
        return normalized != null && PATTERN.matcher(normalized).matches();
    }

    /** Splits a valid BIC, or returns null when the value is not valid. */
    public static Parts parse(String normalized) {
        if (!isValid(normalized)) {
            return null;
        }
        String branchCode = normalized.length() == 11 ? normalized.substring(8, 11) : null;
        return new Parts(normalized.substring(0, 4), normalized.substring(4, 6), normalized.substring(6, 8), branchCode);
    }

    public record Parts(String institutionCode, String countryCode, String locationCode, String branchCode) {
    }
}
