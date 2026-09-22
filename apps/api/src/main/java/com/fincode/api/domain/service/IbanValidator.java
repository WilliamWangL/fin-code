package com.fincode.api.domain.service;

import java.util.regex.Pattern;

/**
 * IBAN primitives (spec §30, §31): charset, country prefix, MOD-97 checksum and
 * national structure matching. A valid IBAN confirms format only — never that
 * the account exists.
 */
public final class IbanValidator {

    private static final Pattern ALPHANUMERIC = Pattern.compile("^[A-Z0-9]+$");
    private static final Pattern COUNTRY_PREFIX = Pattern.compile("^[A-Z]{2}\\d{2}");

    private IbanValidator() {
    }

    public static String normalize(String raw) {
        return IdentifierNormalizer.normalize(raw);
    }

    /** Only A-Z and 0-9 are allowed after normalization. */
    public static boolean charsetValid(String normalized) {
        return normalized != null && ALPHANUMERIC.matcher(normalized).matches();
    }

    /** Two letters followed by two check digits. */
    public static boolean countryPrefixValid(String normalized) {
        return normalized != null && COUNTRY_PREFIX.matcher(normalized).find();
    }

    public static String countryCode(String normalized) {
        return normalized != null && normalized.length() >= 2 ? normalized.substring(0, 2) : null;
    }

    public static String checkDigits(String normalized) {
        return normalized != null && normalized.length() >= 4 ? normalized.substring(2, 4) : null;
    }

    /** ISO 7064 MOD-97-10: move the first four characters to the end, expand letters and reduce mod 97. */
    public static boolean checksumValid(String normalized) {
        if (normalized == null || normalized.length() < 4) {
            return false;
        }
        String rearranged = normalized.substring(4) + normalized.substring(0, 4);
        int remainder = 0;
        for (int i = 0; i < rearranged.length(); i++) {
            char c = rearranged.charAt(i);
            if (c >= '0' && c <= '9') {
                remainder = (remainder * 10 + (c - '0')) % 97;
            } else if (c >= 'A' && c <= 'Z') {
                int value = c - 'A' + 10;
                remainder = (remainder * 100 + value) % 97;
            } else {
                return false;
            }
        }
        return remainder == 1;
    }

    /**
     * Matches the national structure template, e.g. "DEkk BBBB BBBB BBBB BBBB BB":
     * the first two literal letters are the country code, k/n are digits, a is a
     * letter, c and remaining letters are alphanumeric placeholders.
     */
    public static boolean structureMatches(String structure, String normalized) {
        if (structure == null || normalized == null) {
            return false;
        }
        String template = structure.replace(" ", "");
        if (template.length() != normalized.length()) {
            return false;
        }
        for (int i = 0; i < template.length(); i++) {
            char t = template.charAt(i);
            char v = normalized.charAt(i);
            boolean ok;
            if (i < 2) {
                ok = Character.toUpperCase(t) == v;
            } else if (t == 'k' || t == 'n') {
                ok = v >= '0' && v <= '9';
            } else if (t == 'a') {
                ok = v >= 'A' && v <= 'Z';
            } else {
                ok = (v >= 'A' && v <= 'Z') || (v >= '0' && v <= '9');
            }
            if (!ok) {
                return false;
            }
        }
        return true;
    }
}
