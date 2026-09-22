package com.fincode.api.application.service;

import com.fincode.api.config.ResponseCache;
import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.IbanCountryFormat;
import com.fincode.api.domain.repository.CountryRepository;
import com.fincode.api.domain.repository.IbanCountryFormatRepository;
import com.fincode.api.domain.service.IbanPositionParser;
import com.fincode.api.dto.CommonDtos.Position;
import com.fincode.api.dto.CountryDtos.CountryData;
import com.fincode.api.dto.IbanDtos.IbanFormatData;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Country reference queries (spec §28, FIN-005): full list, single country by
 * ISO 3166-1 alpha-2 / alpha-3 code and per-country IBAN format.
 */
@Service
@Transactional(readOnly = true)
public class CountryQueryService {

    private static final Duration CACHE_TTL = Duration.ofHours(1);
    private static final String COUNTRIES_CACHE_KEY = "cache:countries:all";
    private static final String COUNTRY_CACHE_PREFIX = "cache:country:";
    private static final String IBAN_FORMAT_CACHE_PREFIX = "cache:iban-format:";

    private final CountryRepository countryRepository;
    private final IbanCountryFormatRepository ibanCountryFormatRepository;
    private final ResponseCache responseCache;

    public CountryQueryService(CountryRepository countryRepository,
                               IbanCountryFormatRepository ibanCountryFormatRepository,
                               ResponseCache responseCache) {
        this.countryRepository = countryRepository;
        this.ibanCountryFormatRepository = ibanCountryFormatRepository;
        this.responseCache = responseCache;
    }

    public List<CountryData> list() {
        List<CountryData> cached = responseCache.getList(COUNTRIES_CACHE_KEY, CountryData.class);
        if (cached != null) {
            return cached;
        }
        List<CountryData> data = countryRepository.findByStatusOrderByNameEnAsc(EntityStatus.ACTIVE).stream()
                .map(this::toData)
                .toList();
        responseCache.put(COUNTRIES_CACHE_KEY, data, CACHE_TTL);
        return data;
    }

    public CountryData get(String code) {
        String cacheKey = COUNTRY_CACHE_PREFIX + normalizeCode(code);
        CountryData cached = responseCache.get(cacheKey, CountryData.class);
        if (cached != null) {
            return cached;
        }
        CountryData data = toData(findByCode(code));
        responseCache.put(cacheKey, data, CACHE_TTL);
        return data;
    }

    public IbanFormatData ibanFormat(String code) {
        String cacheKey = IBAN_FORMAT_CACHE_PREFIX + normalizeCode(code);
        IbanFormatData cached = responseCache.get(cacheKey, IbanFormatData.class);
        if (cached != null) {
            return cached;
        }
        Country country = findByCode(code);
        if (!Boolean.TRUE.equals(country.getIbanSupported())) {
            throw new ApiException(ErrorCode.IBAN_UNSUPPORTED_COUNTRY);
        }
        IbanCountryFormat format = ibanCountryFormatRepository.findByCountryCode(country.getIso2()).stream()
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        int[] bankPosition = IbanPositionParser.parse(format.getBankIdentifierPosition());
        int[] accountPosition = IbanPositionParser.parse(format.getAccountNumberPosition());
        IbanFormatData data = new IbanFormatData(
                country.getIso2(),
                format.getIbanLength(),
                format.getStructure(),
                toPosition(bankPosition),
                toPosition(accountPosition),
                format.getExample());
        responseCache.put(cacheKey, data, CACHE_TTL);
        return data;
    }

    private static String normalizeCode(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }

    private Country findByCode(String code) {
        String value = normalizeCode(code);
        Optional<Country> country = value.length() == 3
                ? countryRepository.findByIso3(value)
                : countryRepository.findByIso2(value);
        return country.filter(row -> row.getStatus() == EntityStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    private CountryData toData(Country country) {
        return new CountryData(
                country.getIso2(),
                country.getIso3(),
                country.getNameEn(),
                country.getNameLocal(),
                country.getCurrencyCode(),
                country.getIbanSupported(),
                country.getSwiftSupported(),
                country.getLocalIdentifierType() != null ? country.getLocalIdentifierType().name() : null,
                country.getStatus().name());
    }

    private static Position toPosition(int[] range) {
        return range == null ? null : new Position(range[0], range[1]);
    }
}
