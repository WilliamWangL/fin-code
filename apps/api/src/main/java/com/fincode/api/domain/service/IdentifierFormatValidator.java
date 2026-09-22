package com.fincode.api.domain.service;

import com.fincode.api.domain.enums.IdentifierType;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Per-type identifier format rules and display formatting (spec §15, §30).
 */
public final class IdentifierFormatValidator {

    private static final Pattern SIX_DIGITS = Pattern.compile("^\\d{6}$");
    private static final Pattern ELEVEN_IFSC = Pattern.compile("^[A-Z]{4}0[A-Z0-9]{6}$");
    private static final Pattern TWELVE_DIGITS = Pattern.compile("^\\d{12}$");
    private static final Pattern NINE_DIGITS = Pattern.compile("^\\d{9}$");
    private static final Pattern SWIFT_BIC = Pattern.compile("^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$");

    private static final Map<IdentifierType, Pattern> PATTERNS = Map.of(
            IdentifierType.SORT_CODE, SIX_DIGITS,
            IdentifierType.BSB, SIX_DIGITS,
            IdentifierType.IFSC, ELEVEN_IFSC,
            IdentifierType.CNAPS, TWELVE_DIGITS,
            IdentifierType.ABA_ROUTING, NINE_DIGITS,
            IdentifierType.SWIFT, SWIFT_BIC,
            IdentifierType.BIC, SWIFT_BIC);

    private IdentifierFormatValidator() {
    }

    public static String normalize(IdentifierType type, String raw) {
        return IdentifierNormalizer.normalize(raw);
    }

    public static boolean isValid(IdentifierType type, String normalized) {
        if (normalized == null) {
            return false;
        }
        Pattern pattern = PATTERNS.get(type);
        return pattern != null ? pattern.matcher(normalized).matches() : !normalized.isBlank();
    }

    /** Human display format: sort code "20-00-00", BSB "062-001", others as-is. */
    public static String format(IdentifierType type, String normalized) {
        if (normalized == null) {
            return null;
        }
        return switch (type) {
            case SORT_CODE -> normalized.length() == 6
                    ? normalized.substring(0, 2) + "-" + normalized.substring(2, 4) + "-" + normalized.substring(4)
                    : normalized;
            case BSB -> normalized.length() == 6
                    ? normalized.substring(0, 3) + "-" + normalized.substring(3)
                    : normalized;
            default -> normalized;
        };
    }
}
