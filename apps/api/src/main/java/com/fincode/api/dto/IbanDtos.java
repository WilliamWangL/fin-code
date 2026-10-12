package com.fincode.api.dto;

import com.fincode.api.dto.CommonDtos.Position;

/**
 * IBAN validation and format payloads (spec §26, §30).
 */
public final class IbanDtos {

    private IbanDtos() {
    }

    public record IbanChecks(boolean charset, boolean country, boolean length, boolean checksum, boolean structure) {
    }

    public record IbanValidateData(boolean valid, String iban, String country, String checkDigits, String bankCode,
                                   String accountNumber, int length, Integer expectedLength, IbanChecks checks) {
    }

    /** IBAN lookup payload: the parsed fields plus the resolved bank, or null while unknown. */
    public record IbanLookupData(boolean valid, String iban, String country, String checkDigits, String bankCode,
                                 String accountNumber, int length, Integer expectedLength,
                                 IdentifierDtos.SwiftData bank) {
    }

    public record IbanFormatData(String countryCode, int ibanLength, String structure,
                                 Position bankIdentifierPosition, Position accountNumberPosition, String example) {
    }
}
