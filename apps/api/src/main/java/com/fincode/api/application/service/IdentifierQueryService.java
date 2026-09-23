package com.fincode.api.application.service;

import com.fincode.api.config.ResponseCache;
import com.fincode.api.domain.enums.IdentifierType;
import com.fincode.api.domain.model.BankBranch;
import com.fincode.api.domain.model.BankIdentifier;
import com.fincode.api.domain.model.BankRoutingDirectory;
import com.fincode.api.domain.model.BankSwiftCodeDirectory;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.DataSource;
import com.fincode.api.domain.model.FinancialInstitution;
import com.fincode.api.domain.repository.BankBranchRepository;
import com.fincode.api.domain.repository.BankIdentifierRepository;
import com.fincode.api.domain.repository.BankRoutingDirectoryRepository;
import com.fincode.api.domain.repository.BankSwiftCodeDirectoryRepository;
import com.fincode.api.domain.repository.CountryRepository;
import com.fincode.api.domain.repository.DataSourceRepository;
import com.fincode.api.domain.repository.FinancialInstitutionRepository;
import com.fincode.api.domain.service.IdentifierFormatValidator;
import com.fincode.api.domain.service.IdentifierNormalizer;
import com.fincode.api.domain.service.ResolvedIdentifier;
import com.fincode.api.domain.service.RoutingValidator;
import com.fincode.api.domain.service.SwiftValidator;
import com.fincode.api.dto.IdentifierDtos.BsbData;
import com.fincode.api.dto.IdentifierDtos.CnapsData;
import com.fincode.api.dto.IdentifierDtos.IfscData;
import com.fincode.api.dto.IdentifierDtos.RoutingData;
import com.fincode.api.dto.IdentifierDtos.SortCodeData;
import com.fincode.api.dto.IdentifierDtos.SwiftData;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import com.fincode.api.mapper.IdentifierMapper;
import java.time.Duration;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves identifier values to institutions (spec §15, FIN-007).
 * Validation errors raise INVALID_* codes; missing records raise NOT_FOUND.
 */
@Service
@Transactional(readOnly = true)
public class IdentifierQueryService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    private final BankIdentifierRepository identifierRepository;
    private final FinancialInstitutionRepository institutionRepository;
    private final CountryRepository countryRepository;
    private final BankBranchRepository branchRepository;
    private final DataSourceRepository dataSourceRepository;
    private final BankSwiftCodeDirectoryRepository swiftDirectoryRepository;
    private final BankRoutingDirectoryRepository routingDirectoryRepository;
    private final ResponseCache responseCache;

    public IdentifierQueryService(BankIdentifierRepository identifierRepository,
                                  FinancialInstitutionRepository institutionRepository,
                                  CountryRepository countryRepository,
                                  BankBranchRepository branchRepository,
                                  DataSourceRepository dataSourceRepository,
                                  BankSwiftCodeDirectoryRepository swiftDirectoryRepository,
                                  BankRoutingDirectoryRepository routingDirectoryRepository,
                                  ResponseCache responseCache) {
        this.identifierRepository = identifierRepository;
        this.institutionRepository = institutionRepository;
        this.countryRepository = countryRepository;
        this.branchRepository = branchRepository;
        this.dataSourceRepository = dataSourceRepository;
        this.swiftDirectoryRepository = swiftDirectoryRepository;
        this.routingDirectoryRepository = routingDirectoryRepository;
        this.responseCache = responseCache;
    }

    public SwiftData findSwift(String code) {
        String value = SwiftValidator.normalize(code);
        if (!SwiftValidator.isValid(value)) {
            throw new ApiException(ErrorCode.INVALID_SWIFT);
        }
        return cached(IdentifierType.SWIFT, value, SwiftData.class,
                () -> IdentifierMapper.toSwiftData(swiftDirectoryRepository.findBySwiftCode(value)
                        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND))));
    }

    public RoutingData findRouting(String number) {
        String value = RoutingValidator.normalize(number);
        if (!RoutingValidator.isFormValid(value)) {
            throw new ApiException(ErrorCode.INVALID_ROUTING);
        }
        if (!RoutingValidator.checksumValid(value)) {
            throw new ApiException(ErrorCode.INVALID_ROUTING, "The routing number failed checksum validation");
        }
        return cached(IdentifierType.ABA_ROUTING, value, RoutingData.class,
                () -> IdentifierMapper.toRoutingData(routingDirectoryRepository.findByRoutingNumber(value)
                        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND))));
    }

    public SortCodeData findSortCode(String code) {
        return cachedTyped(IdentifierType.SORT_CODE, code, ErrorCode.INVALID_SORT_CODE, SortCodeData.class,
                IdentifierMapper::toSortCodeData);
    }

    public BsbData findBsb(String code) {
        return cachedTyped(IdentifierType.BSB, code, ErrorCode.INVALID_BSB, BsbData.class,
                IdentifierMapper::toBsbData);
    }

    public IfscData findIfsc(String code) {
        return cachedTyped(IdentifierType.IFSC, code, ErrorCode.INVALID_IFSC, IfscData.class,
                IdentifierMapper::toIfscData);
    }

    public CnapsData findCnaps(String code) {
        return cachedTyped(IdentifierType.CNAPS, code, ErrorCode.INVALID_CNAPS, CnapsData.class,
                IdentifierMapper::toCnapsData);
    }

    /** Resolves a raw (not yet normalized) typed value or throws NOT_FOUND. */
    public ResolvedIdentifier resolve(IdentifierType type, String rawValue) {
        String value = IdentifierFormatValidator.normalize(type, rawValue);
        return tryResolve(type, value).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    public Optional<ResolvedIdentifier> tryResolve(IdentifierType type, String normalizedValue) {
        return identifierRepository.findByIdentifierTypeAndIdentifierValue(type, normalizedValue)
                .map(this::assemble);
    }

    private <T> T cachedTyped(IdentifierType type, String rawValue, ErrorCode invalidCode,
                              Class<T> resultType, Function<ResolvedIdentifier, T> mapper) {
        String value = IdentifierNormalizer.normalize(rawValue);
        if (!IdentifierFormatValidator.isValid(type, value)) {
            throw new ApiException(invalidCode);
        }
        return cached(type, value, resultType, () -> mapper.apply(resolve(type, value)));
    }

    private <T> T cached(IdentifierType type, String value, Class<T> resultType, Supplier<T> loader) {
        String key = "cache:identifier:" + type.name() + ":" + value;
        T hit = responseCache.get(key, resultType);
        if (hit != null) {
            return hit;
        }
        T data = loader.get();
        responseCache.put(key, data, CACHE_TTL);
        return data;
    }

    private ResolvedIdentifier assemble(BankIdentifier identifier) {
        FinancialInstitution institution = institutionRepository.findById(identifier.getInstitutionId()).orElse(null);
        Country country = institution != null
                ? countryRepository.findById(institution.getCountryId()).orElse(null)
                : null;
        BankBranch branch = identifier.getBranchId() != null
                ? branchRepository.findById(identifier.getBranchId()).orElse(null)
                : null;
        DataSource source = identifier.getSourceId() != null
                ? dataSourceRepository.findById(identifier.getSourceId()).orElse(null)
                : null;
        return new ResolvedIdentifier(identifier, institution, country, branch, source);
    }
}
