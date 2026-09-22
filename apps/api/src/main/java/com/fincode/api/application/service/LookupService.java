package com.fincode.api.application.service;

import com.fincode.api.domain.enums.IdentifierType;
import com.fincode.api.domain.model.BankIdentifier;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.FinancialInstitution;
import com.fincode.api.domain.repository.BankIdentifierRepository;
import com.fincode.api.domain.repository.CountryRepository;
import com.fincode.api.domain.repository.FinancialInstitutionRepository;
import com.fincode.api.domain.service.IdentifierDetector;
import com.fincode.api.domain.service.IdentifierNormalizer;
import com.fincode.api.domain.service.ResolvedIdentifier;
import com.fincode.api.dto.IbanDtos.IbanValidateData;
import com.fincode.api.dto.LookupDtos.LookupBank;
import com.fincode.api.dto.LookupDtos.LookupData;
import com.fincode.api.dto.LookupDtos.LookupIdentifier;
import com.fincode.api.dto.LookupDtos.LookupSuggestion;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import com.fincode.api.mapper.IdentifierMapper;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Universal lookup (spec §29, FIN-011): normalize, detect the identifier type,
 * resolve it and, when nothing matches, return the closest candidates instead
 * of failing.
 */
@Service
@Transactional(readOnly = true)
public class LookupService {

    private final IdentifierQueryService identifierQueryService;
    private final IbanValidationService ibanValidationService;
    private final BankIdentifierRepository identifierRepository;
    private final FinancialInstitutionRepository institutionRepository;
    private final CountryRepository countryRepository;

    public LookupService(IdentifierQueryService identifierQueryService,
                         IbanValidationService ibanValidationService,
                         BankIdentifierRepository identifierRepository,
                         FinancialInstitutionRepository institutionRepository,
                         CountryRepository countryRepository) {
        this.identifierQueryService = identifierQueryService;
        this.ibanValidationService = ibanValidationService;
        this.identifierRepository = identifierRepository;
        this.institutionRepository = institutionRepository;
        this.countryRepository = countryRepository;
    }

    public LookupData lookup(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        String normalized = IdentifierNormalizer.normalize(query);
        if (normalized == null || normalized.isEmpty()) {
            throw new ApiException(ErrorCode.MISSING_PARAMETER, "Missing required parameter: q");
        }

        if (IdentifierDetector.looksLikeIban(normalized)) {
            return lookupIban(query, normalized);
        }

        List<IdentifierType> candidates = IdentifierDetector.detect(normalized);
        for (IdentifierType type : candidates) {
            Optional<ResolvedIdentifier> match = identifierQueryService.tryResolve(type, normalized);
            if (match.isPresent()) {
                return resolvedData(query, type.name(), normalized, match.get());
            }
        }
        String detectedType = candidates.isEmpty() ? "UNKNOWN" : candidates.get(0).name();
        return new LookupData(query, detectedType, false, null, suggestions(normalized));
    }

    private LookupData lookupIban(String query, String normalizedIban) {
        try {
            IbanValidateData validated = ibanValidationService.validate(normalizedIban);
            String bankCode = validated.bankCode();
            if (bankCode != null) {
                Optional<ResolvedIdentifier> match = identifierQueryService.tryResolve(IdentifierType.BANK_CODE, bankCode);
                if (match.isEmpty()) {
                    match = identifierQueryService.tryResolve(IdentifierType.INSTITUTION_CODE, bankCode);
                }
                if (match.isPresent()) {
                    return resolvedData(query, "IBAN", normalizedIban, match.get());
                }
            }
        } catch (ApiException ignored) {
            // Shape matches an IBAN but validation failed: report unresolved rather than an error.
        }
        return new LookupData(query, "IBAN", false, null, suggestions(normalizedIban));
    }

    private LookupData resolvedData(String query, String type, String value, ResolvedIdentifier resolved) {
        Country country = resolved.country();
        LookupBank bank = resolved.institution() == null ? null
                : new LookupBank(
                        IdentifierMapper.publicBankId(resolved.institution().getId()),
                        resolved.institution().getNameEn(),
                        country != null ? country.getIso2() : null);
        return new LookupData(query, type, true, new LookupIdentifier(type, value, bank), null);
    }

    private List<LookupSuggestion> suggestions(String normalized) {
        List<BankIdentifier> matches = identifierRepository
                .findTop5ByIdentifierValueContainingOrderByIdentifierValueAsc(normalized);
        if (matches.isEmpty()) {
            return List.of();
        }
        Set<Long> institutionIds = matches.stream().map(BankIdentifier::getInstitutionId).collect(Collectors.toSet());
        Map<Long, FinancialInstitution> institutions = institutionRepository.findAllById(institutionIds).stream()
                .collect(Collectors.toMap(FinancialInstitution::getId, Function.identity()));
        Set<Long> countryIds = institutions.values().stream()
                .map(FinancialInstitution::getCountryId)
                .collect(Collectors.toSet());
        Map<Long, String> countryCodes = countryRepository.findAllById(countryIds).stream()
                .collect(Collectors.toMap(Country::getId, Country::getIso2));
        return matches.stream()
                .map(identifier -> {
                    FinancialInstitution institution = institutions.get(identifier.getInstitutionId());
                    return new LookupSuggestion(
                            identifier.getIdentifierType().name(),
                            identifier.getIdentifierValue(),
                            institution != null ? institution.getNameEn() : null,
                            institution != null ? countryCodes.get(institution.getCountryId()) : null);
                })
                .toList();
    }
}
