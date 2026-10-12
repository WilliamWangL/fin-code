package com.fincode.api.application.service;

import com.fincode.api.config.ResponseCache;
import com.fincode.api.domain.enums.IdentifierType;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.IbanBankCodeMap;
import com.fincode.api.domain.model.IbanCountryFormat;
import com.fincode.api.domain.repository.BankSwiftCodeDirectoryRepository;
import com.fincode.api.domain.repository.CountryRepository;
import com.fincode.api.domain.repository.IbanBankCodeMapRepository;
import com.fincode.api.domain.repository.IbanCountryFormatRepository;
import com.fincode.api.domain.service.IbanPositionParser;
import com.fincode.api.domain.service.IbanValidator;
import com.fincode.api.dto.IbanDtos.IbanChecks;
import com.fincode.api.dto.IbanDtos.IbanLookupData;
import com.fincode.api.dto.IbanDtos.IbanValidateData;
import com.fincode.api.dto.IdentifierDtos.SwiftData;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import com.fincode.api.mapper.IdentifierMapper;
import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * End-to-end IBAN validation (spec §30, FIN-008) and local-first IBAN
 * lookup: normalization, charset, country support, length, MOD-97 checksum,
 * national structure and BBAN segment extraction. The lookup resolves the
 * bank through the local bank-code → SWIFT map and the SWIFT directory, and
 * only asks the external provider when the local map has no row (persisting
 * its answer).
 * <p>
 * A valid result confirms format only — never account existence.
 */
@Service
@Transactional(readOnly = true)
public class IbanValidationService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    private final CountryRepository countryRepository;
    private final IbanCountryFormatRepository ibanCountryFormatRepository;
    private final IbanBankCodeMapRepository ibanBankCodeMapRepository;
    private final BankSwiftCodeDirectoryRepository swiftDirectoryRepository;
    private final BankDirectoryEnrichmentService directoryEnrichmentService;
    private final ResponseCache responseCache;

    public IbanValidationService(CountryRepository countryRepository,
                                 IbanCountryFormatRepository ibanCountryFormatRepository,
                                 IbanBankCodeMapRepository ibanBankCodeMapRepository,
                                 BankSwiftCodeDirectoryRepository swiftDirectoryRepository,
                                 BankDirectoryEnrichmentService directoryEnrichmentService,
                                 ResponseCache responseCache) {
        this.countryRepository = countryRepository;
        this.ibanCountryFormatRepository = ibanCountryFormatRepository;
        this.ibanBankCodeMapRepository = ibanBankCodeMapRepository;
        this.swiftDirectoryRepository = swiftDirectoryRepository;
        this.directoryEnrichmentService = directoryEnrichmentService;
        this.responseCache = responseCache;
    }

    public IbanValidateData validate(String rawIban) {
        ParsedIban parsed = parseValid(rawIban);
        return new IbanValidateData(
                true,
                parsed.iban(),
                parsed.countryCode(),
                parsed.checkDigits(),
                parsed.bankCode(),
                parsed.accountNumber(),
                parsed.iban().length(),
                parsed.format().getIbanLength(),
                new IbanChecks(true, true, true, true, true));
    }

    /**
     * IBAN lookup, local first: after the format checks, the bank code
     * extracted from the BBAN resolves through the local bank-code → SWIFT
     * map and the SWIFT directory. Only a local miss asks the external
     * provider, whose answer is persisted for the next lookup. An IBAN whose
     * bank is still unknown is a valid response with a null bank — the
     * format verdict never depends on the directory.
     */
    public IbanLookupData findIban(String rawIban) {
        ParsedIban parsed = parseValid(rawIban);
        return cached(parsed.iban(), IbanLookupData.class, () -> new IbanLookupData(
                true,
                parsed.iban(),
                parsed.countryCode(),
                parsed.checkDigits(),
                parsed.bankCode(),
                parsed.accountNumber(),
                parsed.iban().length(),
                parsed.format().getIbanLength(),
                resolveBank(parsed).orElse(null)));
    }

    private Optional<SwiftData> resolveBank(ParsedIban parsed) {
        if (parsed.bankCode() == null || parsed.bankCode().isBlank()) {
            return Optional.empty();
        }
        // Local first: the bank-code map points at a SWIFT code, the
        // directory row carries the bank details.
        Optional<SwiftData> local = ibanBankCodeMapRepository
                .findByCountryCodeAndBankCode(parsed.countryCode(), parsed.bankCode())
                .map(IbanBankCodeMap::getSwiftCode)
                .flatMap(this::directoryBank);
        if (local.isPresent()) {
            return local;
        }
        // Local miss: enrich externally; the hit persists the map row and
        // the directory row for the next lookup.
        return directoryEnrichmentService.lookupAndPersistIban(parsed.iban())
                .map(IdentifierMapper::toSwiftData);
    }

    /** Maps a mapped SWIFT code to bank details, re-running the SWIFT enrichment when the directory row is gone. */
    private Optional<SwiftData> directoryBank(String swiftCode) {
        return swiftDirectoryRepository.findBySwiftCode(swiftCode)
                .or(() -> directoryEnrichmentService.lookupAndPersistSwift(swiftCode))
                .map(IdentifierMapper::toSwiftData);
    }

    /** Full local validation; throws INVALID_* on the first failing check. */
    private ParsedIban parseValid(String rawIban) {
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

        return new ParsedIban(
                iban,
                countryCode,
                IbanValidator.checkDigits(iban),
                format,
                IbanPositionParser.extract(iban, format.getBankIdentifierPosition()),
                IbanPositionParser.extract(iban, format.getAccountNumberPosition()));
    }

    private <T> T cached(String iban, Class<T> type, Supplier<T> loader) {
        String key = "cache:identifier:" + IdentifierType.IBAN.name() + ":" + iban;
        T hit = responseCache.get(key, type);
        if (hit != null) {
            return hit;
        }
        T data = loader.get();
        responseCache.put(key, data, CACHE_TTL);
        return data;
    }

    private record ParsedIban(String iban, String countryCode, String checkDigits, IbanCountryFormat format,
                              String bankCode, String accountNumber) {
    }
}
