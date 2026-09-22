package com.fincode.api.application.service;

import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.IbanCountryFormat;
import com.fincode.api.domain.repository.CountryRepository;
import com.fincode.api.domain.repository.IbanCountryFormatRepository;
import com.fincode.api.domain.service.IbanPositionParser;
import com.fincode.api.domain.service.IbanValidator;
import com.fincode.api.dto.IbanDtos.IbanChecks;
import com.fincode.api.dto.IbanDtos.IbanValidateData;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * End-to-end IBAN validation (spec §30, FIN-008): normalization, charset,
 * country support, length, MOD-97 checksum, national structure and BBAN
 * segment extraction.
 * <p>
 * A valid result confirms format only — never account existence.
 */
@Service
@Transactional(readOnly = true)
public class IbanValidationService {

    private final CountryRepository countryRepository;
    private final IbanCountryFormatRepository ibanCountryFormatRepository;

    public IbanValidationService(CountryRepository countryRepository,
                                 IbanCountryFormatRepository ibanCountryFormatRepository) {
        this.countryRepository = countryRepository;
        this.ibanCountryFormatRepository = ibanCountryFormatRepository;
    }

    public IbanValidateData validate(String rawIban) {
        String iban = IbanValidator.normalize(rawIban);
        if (iban == null || iban.length() < 4 || !IbanValidator.charsetValid(iban)
                || !IbanValidator.countryPrefixValid(iban)) {
            throw new ApiException(ErrorCode.INVALID_IBAN, "The IBAN must start with a two-letter country code and two check digits");
        }

        String countryCode = IbanValidator.countryCode(iban);
        Country country = countryRepository.findByIso2(countryCode).orElse(null);
        if (country == null || !Boolean.TRUE.equals(country.getIbanSupported())) {
            throw new ApiException(ErrorCode.IBAN_UNSUPPORTED_COUNTRY);
        }

        IbanCountryFormat format = ibanCountryFormatRepository.findByCountryCode(countryCode).stream()
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_IBAN, "No IBAN format definition for " + countryCode));

        int expectedLength = format.getIbanLength();
        if (iban.length() != expectedLength) {
            throw new ApiException(ErrorCode.INVALID_IBAN,
                    "Length must be " + expectedLength + " characters for " + countryCode + ", got " + iban.length());
        }
        if (!IbanValidator.checksumValid(iban)) {
            throw new ApiException(ErrorCode.INVALID_IBAN, "The IBAN checksum (MOD-97) is invalid");
        }
        if (!IbanValidator.structureMatches(format.getStructure(), iban)) {
            throw new ApiException(ErrorCode.INVALID_IBAN, "The IBAN does not match the national structure");
        }

        String bankCode = IbanPositionParser.extract(iban, format.getBankIdentifierPosition());
        String accountNumber = IbanPositionParser.extract(iban, format.getAccountNumberPosition());

        return new IbanValidateData(
                true,
                iban,
                countryCode,
                IbanValidator.checkDigits(iban),
                bankCode,
                accountNumber,
                iban.length(),
                expectedLength,
                new IbanChecks(true, true, true, true, true));
    }
}
