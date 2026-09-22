package com.fincode.api.dto;

/**
 * Country reference payloads (spec §28).
 */
public final class CountryDtos {

    private CountryDtos() {
    }

    public record CountryData(String countryCode, String iso3, String nameEn, String nameLocal,
                              String currencyCode, Boolean ibanSupported, Boolean swiftSupported,
                              String localIdentifierType, String status) {
    }
}
