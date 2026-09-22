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

    public record IbanFormatData(String countryCode, int ibanLength, String structure,
                                 Position bankIdentifierPosition, Position accountNumberPosition, String example) {
    }
}
