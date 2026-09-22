package com.fincode.api.domain.service;

/**
 * Parses IBAN segment positions stored as 1-based "start-length" strings,
 * e.g. "5-8" means start at position 5 with length 8.
 */
public final class IbanPositionParser {

    private IbanPositionParser() {
    }

    /** @return int[]{start, length} or null when absent/invalid. */
    public static int[] parse(String position) {
        if (position == null || position.isBlank()) {
            return null;
        }
        String[] parts = position.trim().split("-");
        if (parts.length != 2) {
            return null;
        }
        try {
            int start = Integer.parseInt(parts[0].trim());
            int length = Integer.parseInt(parts[1].trim());
            return start > 0 && length > 0 ? new int[] {start, length} : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    /** Extracts the 1-based segment from a normalized IBAN, or null when not extractable. */
    public static String extract(String normalizedIban, String position) {
        int[] range = parse(position);
        if (range == null || normalizedIban == null) {
            return null;
        }
        int from = range[0] - 1;
        int to = from + range[1];
        return from >= 0 && to <= normalizedIban.length() ? normalizedIban.substring(from, to) : null;
    }
}
