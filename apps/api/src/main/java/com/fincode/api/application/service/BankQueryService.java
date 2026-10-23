package com.fincode.api.application.service;

import com.fincode.api.config.ResponseCache;
import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.enums.IdentifierType;
import com.fincode.api.domain.model.BankBranch;
import com.fincode.api.domain.model.BankIdentifier;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.FinancialInstitution;
import com.fincode.api.domain.repository.BankBranchRepository;
import com.fincode.api.domain.repository.BankIdentifierRepository;
import com.fincode.api.domain.repository.CountryRepository;
import com.fincode.api.domain.repository.FinancialInstitutionRepository;
import com.fincode.api.dto.BankDtos.BankDetailData;
import com.fincode.api.dto.BankDtos.BankListItem;
import com.fincode.api.dto.BankDtos.BranchData;
import com.fincode.api.dto.CommonDtos.IdentifierRef;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import com.fincode.api.mapper.IdentifierMapper;
import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bank directory queries (spec §27, FIN-006): cursor-paginated listing, name
 * search, single institution detail and branch listing.
 */
@Service
@Transactional(readOnly = true)
public class BankQueryService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;
    private static final String PUBLIC_ID_PREFIX = "inst_";
    private static final Duration DETAIL_CACHE_TTL = Duration.ofMinutes(5);
    private static final String BANK_CACHE_PREFIX = "cache:bank:";
    /** Branch-level identifier types that qualify as a branch's national code. */
    private static final List<IdentifierType> BRANCH_CODE_TYPES = List.of(
            IdentifierType.BSB, IdentifierType.CNAPS, IdentifierType.IFSC,
            IdentifierType.SORT_CODE, IdentifierType.TRANSIT_NUMBER, IdentifierType.CLEARING_CODE);

    private final FinancialInstitutionRepository institutionRepository;
    private final BankIdentifierRepository identifierRepository;
    private final BankBranchRepository branchRepository;
    private final CountryRepository countryRepository;
    private final ResponseCache responseCache;

    public BankQueryService(FinancialInstitutionRepository institutionRepository,
                            BankIdentifierRepository identifierRepository,
                            BankBranchRepository branchRepository,
                            CountryRepository countryRepository,
                            ResponseCache responseCache) {
        this.institutionRepository = institutionRepository;
        this.identifierRepository = identifierRepository;
        this.branchRepository = branchRepository;
        this.countryRepository = countryRepository;
        this.responseCache = responseCache;
    }

    public Paged<List<BankListItem>> list(String countryCode, String cursor, Integer limit) {
        int pageSize = resolveLimit(limit);
        long afterId = parseCursor(cursor);
        List<FinancialInstitution> rows;
        if (countryCode == null || countryCode.isBlank()) {
            rows = institutionRepository.findByStatusAndIdGreaterThanOrderByIdAsc(
                    EntityStatus.ACTIVE, afterId, PageRequest.of(0, pageSize + 1));
        } else {
            Long countryId = countryRepository.findByIso2(countryCode.trim().toUpperCase(Locale.ROOT))
                    .map(Country::getId)
                    .orElse(null);
            if (countryId == null) {
                return new Paged<>(List.of(), null);
            }
            rows = institutionRepository.findByStatusAndCountryIdAndIdGreaterThanOrderByIdAsc(
                    EntityStatus.ACTIVE, countryId, afterId, PageRequest.of(0, pageSize + 1));
        }
        return paginate(rows, pageSize, this::toListItems, FinancialInstitution::getId);
    }

    public Paged<List<BankListItem>> search(String q, String countryCode, String cursor, Integer limit) {
        if (q == null || q.isBlank()) {
            throw new ApiException(ErrorCode.MISSING_PARAMETER, "Missing required parameter: q");
        }
        int pageSize = resolveLimit(limit);
        long afterId = parseCursor(cursor);
        Long countryId = null;
        if (countryCode != null && !countryCode.isBlank()) {
            countryId = countryRepository.findByIso2(countryCode.trim().toUpperCase(Locale.ROOT))
                    .map(Country::getId)
                    .orElse(null);
            if (countryId == null) {
                return new Paged<>(List.of(), null);
            }
        }
        List<FinancialInstitution> rows = institutionRepository.search(
                EntityStatus.ACTIVE, q.trim(), countryId, afterId, PageRequest.of(0, pageSize + 1));
        return paginate(rows, pageSize, this::toListItems, FinancialInstitution::getId);
    }

    public BankDetailData get(String publicId) {
        String cacheKey = BANK_CACHE_PREFIX + publicId;
        BankDetailData cached = responseCache.get(cacheKey, BankDetailData.class);
        if (cached != null) {
            return cached;
        }
        FinancialInstitution institution = institutionRepository.findById(parsePublicId(publicId))
                .filter(row -> row.getStatus() == EntityStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        BankDetailData data = buildDetail(institution);
        responseCache.put(cacheKey, data, DETAIL_CACHE_TTL);
        return data;
    }

    /** Website directory lookup by URL slug (V17); serves the /banks/[slug] pages via the web BFF. */
    public BankDetailData getBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        String trimmed = slug.trim();
        String cacheKey = BANK_CACHE_PREFIX + "slug:" + trimmed;
        BankDetailData cached = responseCache.get(cacheKey, BankDetailData.class);
        if (cached != null) {
            return cached;
        }
        FinancialInstitution institution = institutionRepository.findBySlugAndStatus(trimmed, EntityStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        BankDetailData data = buildDetail(institution);
        responseCache.put(cacheKey, data, DETAIL_CACHE_TTL);
        return data;
    }

    private BankDetailData buildDetail(FinancialInstitution institution) {
        Map<Long, String> countryCodes = countryCodes(List.of(institution));
        List<IdentifierRef> identifiers = identifierRepository.findByInstitutionIdInOrderByIdAsc(List.of(institution.getId()))
                .stream()
                .map(identifier -> new IdentifierRef(identifier.getIdentifierType().name(), identifier.getIdentifierValue()))
                .toList();
        long branchCount = branchRepository.countByInstitutionIdAndStatus(institution.getId(), EntityStatus.ACTIVE);
        return new BankDetailData(
                IdentifierMapper.publicBankId(institution.getId()),
                institution.getNameEn(),
                institution.getNameLocal(),
                institution.getShortName(),
                countryCodes.get(institution.getCountryId()),
                institution.getWebsite(),
                institution.getStatus().name(),
                identifiers,
                branchCount);
    }

    public Paged<List<BranchData>> branches(String publicId, String cursor, Integer limit, String q, String city) {
        FinancialInstitution institution = institutionRepository.findById(parsePublicId(publicId))
                .filter(row -> row.getStatus() == EntityStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        int pageSize = resolveLimit(limit);
        long afterId = parseCursor(cursor);
        String query = (q == null || q.isBlank()) ? null : q.trim();
        String cityFilter = (city == null || city.isBlank()) ? null : city.trim();
        List<BankBranch> rows;
        if (query == null && cityFilter == null) {
            rows = branchRepository.findByInstitutionIdAndStatusAndIdGreaterThanOrderByIdAsc(
                    institution.getId(), EntityStatus.ACTIVE, afterId, PageRequest.of(0, pageSize + 1));
        } else {
            rows = branchRepository.searchBranches(
                    institution.getId(), EntityStatus.ACTIVE, query, cityFilter, afterId, PageRequest.of(0, pageSize + 1));
        }
        Map<Long, String> codes = branchCodes(rows);
        return paginate(rows, pageSize,
                page -> page.stream().map(branch -> IdentifierMapper.toBranchData(branch, codes.get(branch.getId()))).toList(),
                BankBranch::getId);
    }

    /**
     * National branch code per branch id, picked from branch-level identifiers
     * (BSB/CNAPS/...) - SWIFT and institution-level rows are ignored.
     */
    private Map<Long, String> branchCodes(List<BankBranch> rows) {
        List<Long> branchIds = rows.stream().map(BankBranch::getId).toList();
        if (branchIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<BankIdentifier>> byBranch = identifierRepository
                .findByBranchIdInOrderByIdAsc(branchIds).stream()
                .filter(identifier -> identifier.getBranchId() != null)
                .collect(Collectors.groupingBy(BankIdentifier::getBranchId));
        Map<Long, String> codes = new HashMap<>();
        byBranch.forEach((branchId, identifiers) -> {
            for (IdentifierType type : BRANCH_CODE_TYPES) {
                String value = identifiers.stream()
                        .filter(identifier -> identifier.getIdentifierType() == type)
                        .map(BankIdentifier::getIdentifierValue)
                        .findFirst()
                        .orElse(null);
                if (value != null) {
                    codes.put(branchId, value);
                    break;
                }
            }
        });
        return codes;
    }

    private List<BankListItem> toListItems(List<FinancialInstitution> institutions) {
        if (institutions.isEmpty()) {
            return List.of();
        }
        List<Long> ids = institutions.stream().map(FinancialInstitution::getId).toList();
        Map<Long, List<IdentifierRef>> identifiersByInstitution = identifierRepository
                .findByInstitutionIdInOrderByIdAsc(ids).stream()
                .collect(Collectors.groupingBy(BankIdentifier::getInstitutionId,
                        Collectors.mapping(
                                identifier -> new IdentifierRef(identifier.getIdentifierType().name(), identifier.getIdentifierValue()),
                                Collectors.toList())));
        Map<Long, String> countryCodes = countryCodes(institutions);
        return institutions.stream()
                .map(institution -> new BankListItem(
                        IdentifierMapper.publicBankId(institution.getId()),
                        institution.getNameEn(),
                        institution.getNameLocal(),
                        institution.getShortName(),
                        countryCodes.get(institution.getCountryId()),
                        identifiersByInstitution.getOrDefault(institution.getId(), List.of())))
                .toList();
    }

    private Map<Long, String> countryCodes(Collection<FinancialInstitution> institutions) {
        Set<Long> countryIds = institutions.stream()
                .map(FinancialInstitution::getCountryId)
                .collect(Collectors.toSet());
        return countryRepository.findAllById(countryIds).stream()
                .collect(Collectors.toMap(Country::getId, Country::getIso2));
    }

    private static <E, D> Paged<List<D>> paginate(List<E> rows, int pageSize,
                                                  Function<List<E>, List<D>> mapper,
                                                  Function<E, Long> idOf) {
        boolean hasMore = rows.size() > pageSize;
        List<E> pageRows = hasMore ? rows.subList(0, pageSize) : rows;
        String nextCursor = hasMore ? String.valueOf(idOf.apply(pageRows.get(pageRows.size() - 1))) : null;
        return new Paged<>(mapper.apply(pageRows), nextCursor);
    }

    private static int resolveLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "limit must be between 1 and " + MAX_LIMIT);
        }
        return limit;
    }

    private static long parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0L;
        }
        try {
            long value = Long.parseLong(cursor.trim());
            if (value < 0) {
                throw new NumberFormatException();
            }
            return value;
        } catch (NumberFormatException exception) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Invalid cursor");
        }
    }

    private static Long parsePublicId(String publicId) {
        if (publicId != null && publicId.startsWith(PUBLIC_ID_PREFIX)) {
            try {
                return Long.parseLong(publicId.substring(PUBLIC_ID_PREFIX.length()));
            } catch (NumberFormatException ignored) {
                // fall through to NOT_FOUND
            }
        }
        throw new ApiException(ErrorCode.NOT_FOUND);
    }
}
