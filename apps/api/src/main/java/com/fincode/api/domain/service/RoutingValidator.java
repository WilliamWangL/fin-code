package com.fincode.api.domain.service;

import java.util.regex.Pattern;

/**
 * ABA routing number validation (spec §32): 9 digits with the weighted
 * checksum 3,7,1,3,7,1,3,7,1 (sum % 10 == 0).
 */
public final class RoutingValidator {

    private static final Pattern NINE_DIGITS = Pattern.compile("^\\d{9}$");
    private static final int[] WEIGHTS = {3, 7, 1, 3, 7, 1, 3, 7, 1};

    private RoutingValidator() {
    }

    public static String normalize(String raw) {
        return IdentifierNormalizer.normalize(raw);
    }

    public static boolean isFormValid(String normalized) {
        return normalized != null && NINE_DIGITS.matcher(normalized).matches();
    }

    public static boolean checksumValid(String normalized) {
        if (!isFormValid(normalized)) {
            return false;
        }
        int sum = 0;
        for (int i = 0; i < 9; i++) {
            sum += (normalized.charAt(i) - '0') * WEIGHTS[i];
        }
        return sum % 10 == 0;
    }
}
