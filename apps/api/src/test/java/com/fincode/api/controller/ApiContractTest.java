package com.fincode.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fincode.api.TestcontainersConfiguration;
import com.fincode.api.application.service.ApiKeyService;
import com.fincode.api.domain.enums.IdentifierType;
import com.fincode.api.domain.enums.InstitutionType;
import com.fincode.api.domain.enums.Plan;
import com.fincode.api.domain.model.ApiKey;
import com.fincode.api.domain.model.BankBranch;
import com.fincode.api.domain.model.BankIdentifier;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.FinancialInstitution;
import com.fincode.api.domain.model.IbanCountryFormat;
import com.fincode.api.domain.repository.ApiKeyRepository;
import com.fincode.api.domain.repository.BankBranchRepository;
import com.fincode.api.domain.repository.BankIdentifierRepository;
import com.fincode.api.domain.repository.CountryRepository;
import com.fincode.api.domain.repository.FinancialInstitutionRepository;
import com.fincode.api.domain.repository.IbanCountryFormatRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

/**
 * End-to-end contract tests over the real filter chain (spec §24-§29):
 * authentication, rate limiting, quota, the unified response envelope and the
 * happy/unhappy paths of every V1 endpoint family.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CountryRepository countryRepository;

    @Autowired
    private IbanCountryFormatRepository ibanCountryFormatRepository;

    @Autowired
    private FinancialInstitutionRepository institutionRepository;

    @Autowired
    private BankIdentifierRepository identifierRepository;

    @Autowired
    private BankBranchRepository branchRepository;

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @Autowired
    private ApiKeyService apiKeyService;

    @Autowired
    private StringRedisTemplate redis;

    private String enterpriseKey;
    private String freeKey;
    private String quotaKey;
    private Long icbcId;

    @BeforeAll
    void seedData() {
        Country cn = saveCountry("CN", "CHN", "China", false);
        Country de = saveCountry("DE", "DEU", "Germany", true);
        Country us = saveCountry("US", "USA", "United States", false);
        Country gb = saveCountry("GB", "GBR", "United Kingdom", false);
        Country au = saveCountry("AU", "AUS", "Australia", false);
        Country india = saveCountry("IN", "IND", "India", false);

        IbanCountryFormat format = new IbanCountryFormat();
        format.setCountryCode("DE");
        format.setIbanLength(22);
        format.setBbanLength(18);
        format.setStructure("DEkk BBBB BBBB BBBB BBBB BB");
        format.setBankIdentifierPosition("5-8");
        format.setAccountNumberPosition("13-10");
        format.setExample("DE89370400440532013000");
        ibanCountryFormatRepository.save(format);

        FinancialInstitution icbc = saveInstitution("Industrial and Commercial Bank of China Limited",
                "Industrial and Commercial Bank of China", "中国工商银行股份有限公司", "ICBC", cn, "https://www.icbc.com.cn");
        FinancialInstitution deutsche = saveInstitution("Deutsche Bank AG", "Deutsche Bank", null, "DB", de, "https://www.db.com");
        FinancialInstitution jpmorgan = saveInstitution("JPMorgan Chase Bank, N.A.", "JPMorgan Chase Bank, N.A.",
                null, "JPMorgan Chase", us, "https://www.jpmorganchase.com");
        FinancialInstitution barclays = saveInstitution("Barclays Bank UK PLC", "Barclays Bank UK PLC",
                null, "Barclays", gb, "https://www.barclays.co.uk");
        FinancialInstitution commbank = saveInstitution("Commonwealth Bank of Australia",
                "Commonwealth Bank of Australia", null, "CommBank", au, "https://www.commbank.com.au");
        FinancialInstitution sbi = saveInstitution("State Bank of India", "State Bank of India",
                null, "SBI", india, "https://www.sbi.co.in");

        BankBranch branch = new BankBranch();
        branch.setInstitutionId(icbc.getId());
        branch.setBranchName("中国工商银行北京分行");
        branch.setBranchNameEn("Beijing Branch");
        branch.setCity("Beijing");
        branch.setState("Beijing");
        branch = branchRepository.save(branch);

        saveIdentifier(icbc.getId(), branch.getId(), IdentifierType.SWIFT, "ICBKCNBJ", cn);
        saveIdentifier(icbc.getId(), null, IdentifierType.CNAPS, "102100099996", cn);
        saveIdentifier(deutsche.getId(), null, IdentifierType.SWIFT, "DEUTDEFF", de);
        saveIdentifier(jpmorgan.getId(), null, IdentifierType.ABA_ROUTING, "021000021", us);
        saveIdentifier(barclays.getId(), null, IdentifierType.SORT_CODE, "200000", gb);
        saveIdentifier(commbank.getId(), null, IdentifierType.BSB, "062001", au);
        saveIdentifier(sbi.getId(), null, IdentifierType.IFSC, "SBIN0001234", india);

        icbcId = icbc.getId();
        enterpriseKey = apiKeyService.create("contract-enterprise", false, Plan.ENTERPRISE).rawKey();
        freeKey = apiKeyService.create("contract-free", false, Plan.FREE).rawKey();
        quotaKey = apiKeyService.create("contract-quota", false, Plan.FREE).rawKey();
    }

    // ── Authentication ──────────────────────────────────────────────────────

    @Test
    void missingAuthorizationReturns401Envelope() throws Exception {
        mockMvc.perform(get("/v1/countries"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("X-Request-Id"))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.error.message").isNotEmpty())
                .andExpect(jsonPath("$.error.request_id", startsWith("req_")));
    }

    @Test
    void invalidKeyReturns401() throws Exception {
        mockMvc.perform(get("/v1/countries").header(HttpHeaders.AUTHORIZATION, "Bearer sk_test_not-a-real-key"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void clientSuppliedRequestIdIsEchoed() throws Exception {
        mockMvc.perform(get("/v1/countries")
                        .header("X-Request-Id", "req_test1234abcd")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Request-Id", "req_test1234abcd"))
                .andExpect(jsonPath("$.meta.request_id").value("req_test1234abcd"));
    }

    // ── IBAN ────────────────────────────────────────────────────────────────

    @Test
    void ibanValidationSucceeds() throws Exception {
        mockMvc.perform(get("/v1/iban/validate")
                        .param("iban", "DE89 3704 0044 0532 0130 00")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.valid").value(true))
                .andExpect(jsonPath("$.data.iban").value("DE89370400440532013000"))
                .andExpect(jsonPath("$.data.country").value("DE"))
                .andExpect(jsonPath("$.data.check_digits").value("89"))
                .andExpect(jsonPath("$.data.bank_code").value("37040044"))
                .andExpect(jsonPath("$.data.account_number").value("0532013000"))
                .andExpect(jsonPath("$.data.length").value(22))
                .andExpect(jsonPath("$.data.expected_length").value(22))
                .andExpect(jsonPath("$.data.checks.charset").value(true))
                .andExpect(jsonPath("$.data.checks.checksum").value(true))
                .andExpect(jsonPath("$.data.checks.structure").value(true))
                .andExpect(jsonPath("$.meta.request_id", startsWith("req_")));
    }

    @Test
    void ibanValidationRejectsBadChecksum() throws Exception {
        mockMvc.perform(get("/v1/iban/validate")
                        .param("iban", "DE89370400440532013001")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("INVALID_IBAN"));
    }

    @Test
    void ibanValidationRejectsUnsupportedCountry() throws Exception {
        mockMvc.perform(get("/v1/iban/validate")
                        .param("iban", "US12345678901234567")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("IBAN_UNSUPPORTED_COUNTRY"));
    }

    @Test
    void ibanValidationRequiresParameter() throws Exception {
        mockMvc.perform(get("/v1/iban/validate").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("MISSING_PARAMETER"));
    }

    // ── Typed identifiers ───────────────────────────────────────────────────

    @Test
    void swiftLookupResolvesInstitution() throws Exception {
        mockMvc.perform(get("/v1/swift/ICBKCNBJ").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.swift_code").value("ICBKCNBJ"))
                .andExpect(jsonPath("$.data.bic").value("ICBKCNBJ"))
                .andExpect(jsonPath("$.data.format.institution_code").value("ICBK"))
                .andExpect(jsonPath("$.data.format.country_code").value("CN"))
                .andExpect(jsonPath("$.data.format.location_code").value("BJ"))
                .andExpect(jsonPath("$.data.bank.id", startsWith("inst_")))
                .andExpect(jsonPath("$.data.bank.name_en").value("Industrial and Commercial Bank of China"))
                .andExpect(jsonPath("$.data.bank.country").value("CN"))
                .andExpect(jsonPath("$.data.city").value("Beijing"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void swiftLookupRejectsInvalidCode() throws Exception {
        mockMvc.perform(get("/v1/swift/ICBKCNB").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("INVALID_SWIFT"));
    }

    @Test
    void swiftLookupReturnsNotFoundForUnknownCode() throws Exception {
        mockMvc.perform(get("/v1/swift/AAAAAA1B").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void routingLookupValidatesChecksum() throws Exception {
        mockMvc.perform(get("/v1/routing/021000021").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.routing_number").value("021000021"))
                .andExpect(jsonPath("$.data.checksum_valid").value(true))
                .andExpect(jsonPath("$.data.bank.short_name").value("JPMorgan Chase"));

        mockMvc.perform(get("/v1/routing/123456789").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("INVALID_ROUTING"));
    }

    @Test
    void sortCodeAndBsbLookupsFormatValues() throws Exception {
        mockMvc.perform(get("/v1/sort-code/20-00-00").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sort_code").value("200000"))
                .andExpect(jsonPath("$.data.formatted").value("20-00-00"))
                .andExpect(jsonPath("$.data.bank.short_name").value("Barclays"));

        mockMvc.perform(get("/v1/bsb/062-001").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bsb").value("062001"))
                .andExpect(jsonPath("$.data.formatted").value("062-001"))
                .andExpect(jsonPath("$.data.bank.short_name").value("CommBank"));
    }

    @Test
    void ifscAndCnapsLookupsResolve() throws Exception {
        mockMvc.perform(get("/v1/ifsc/SBIN0001234").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ifsc").value("SBIN0001234"))
                .andExpect(jsonPath("$.data.bank.short_name").value("SBI"));

        String cnapsBody = mockMvc.perform(get("/v1/cnaps/102100099996")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cnaps").value("102100099996"))
                .andExpect(jsonPath("$.data.bank_code").value("102"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat((String) JsonPath.read(cnapsBody, "$.data.bank.name_local"))
                .isEqualTo("中国工商银行股份有限公司");
    }

    // ── Banks ───────────────────────────────────────────────────────────────

    @Test
    void banksListIsCursorPaginated() throws Exception {
        String firstPage = mockMvc.perform(get("/v1/banks")
                        .param("limit", "2")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].id", startsWith("inst_")))
                .andExpect(jsonPath("$.data[0].identifiers").isArray())
                .andExpect(jsonPath("$.meta.next_cursor").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        String cursor = JsonPath.read(firstPage, "$.meta.next_cursor");
        String secondPage = mockMvc.perform(get("/v1/banks")
                        .param("limit", "2")
                        .param("cursor", cursor)
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andReturn().getResponse().getContentAsString();

        String firstId = JsonPath.read(firstPage, "$.data[0].id");
        String secondId = JsonPath.read(secondPage, "$.data[0].id");
        assertThat(secondId).isNotEqualTo(firstId);
    }

    @Test
    void banksListFiltersByCountry() throws Exception {
        mockMvc.perform(get("/v1/banks")
                        .param("country", "US")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].short_name").value("JPMorgan Chase"));
    }

    @Test
    void banksSearchMatchesNames() throws Exception {
        mockMvc.perform(get("/v1/banks/search")
                        .param("q", "Chase")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].short_name").value("JPMorgan Chase"));
    }

    @Test
    void bankDetailAndBranches() throws Exception {
        String publicId = "inst_" + icbcId;
        mockMvc.perform(get("/v1/banks/" + publicId).header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(publicId))
                .andExpect(jsonPath("$.data.name_en").value("Industrial and Commercial Bank of China"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.identifiers", hasSize(2)));

        mockMvc.perform(get("/v1/banks/" + publicId + "/branches")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id", startsWith("br_")))
                .andExpect(jsonPath("$.data[0].city").value("Beijing"));
    }

    @Test
    void bankNotFoundUsesEnvelope() throws Exception {
        mockMvc.perform(get("/v1/banks/inst_999999").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));

        mockMvc.perform(get("/v1/banks/not-a-valid-id").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isNotFound());
    }

    // ── Countries ───────────────────────────────────────────────────────────

    @Test
    void countriesListAndDetail() throws Exception {
        mockMvc.perform(get("/v1/countries").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(6)));

        mockMvc.perform(get("/v1/countries/DE").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.country_code").value("DE"))
                .andExpect(jsonPath("$.data.iso3").value("DEU"))
                .andExpect(jsonPath("$.data.iban_supported").value(true));

        mockMvc.perform(get("/v1/countries/DEU").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.country_code").value("DE"));
    }

    @Test
    void ibanFormatEndpoint() throws Exception {
        mockMvc.perform(get("/v1/countries/DE/iban-format").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.country_code").value("DE"))
                .andExpect(jsonPath("$.data.iban_length").value(22))
                .andExpect(jsonPath("$.data.structure").value("DEkk BBBB BBBB BBBB BBBB BB"))
                .andExpect(jsonPath("$.data.bank_identifier_position.start").value(5))
                .andExpect(jsonPath("$.data.bank_identifier_position.length").value(8))
                .andExpect(jsonPath("$.data.account_number_position.start").value(13))
                .andExpect(jsonPath("$.data.example").value("DE89370400440532013000"));

        mockMvc.perform(get("/v1/countries/US/iban-format").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("IBAN_UNSUPPORTED_COUNTRY"));
    }

    // ── Lookup ──────────────────────────────────────────────────────────────

    @Test
    void lookupResolvesDetectedType() throws Exception {
        mockMvc.perform(get("/v1/lookup")
                        .param("q", "ICBKCNBJ")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.query").value("ICBKCNBJ"))
                .andExpect(jsonPath("$.data.detected_type").value("SWIFT"))
                .andExpect(jsonPath("$.data.resolved").value(true))
                .andExpect(jsonPath("$.data.identifier.type").value("SWIFT"))
                .andExpect(jsonPath("$.data.identifier.bank.id", startsWith("inst_")));
    }

    @Test
    void lookupReturnsSuggestionsWhenUnresolved() throws Exception {
        mockMvc.perform(get("/v1/lookup")
                        .param("q", "ICBK")
                        .header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.detected_type").value("UNKNOWN"))
                .andExpect(jsonPath("$.data.resolved").value(false))
                .andExpect(jsonPath("$.data.suggestions[0].type").value("SWIFT"))
                .andExpect(jsonPath("$.data.suggestions[0].value").value("ICBKCNBJ"))
                .andExpect(jsonPath("$.data.suggestions[0].name").value("Industrial and Commercial Bank of China"));
    }

    // ── Error handling, limits and quota ────────────────────────────────────

    @Test
    void unknownPathReturnsNotFoundEnvelope() throws Exception {
        mockMvc.perform(get("/v1/unknown-endpoint").header(HttpHeaders.AUTHORIZATION, bearer(enterpriseKey)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.error.request_id", startsWith("req_")));
    }

    @Test
    void rateLimitReturns429AfterFreePlanBurst() throws Exception {
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(get("/v1/countries").header(HttpHeaders.AUTHORIZATION, bearer(freeKey)))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(get("/v1/countries").header(HttpHeaders.AUTHORIZATION, bearer(freeKey)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"));
    }

    @Test
    void quotaExceededReturns402() throws Exception {
        ApiKey key = apiKeyRepository.findByKeyHash(ApiKeyService.hash(quotaKey)).orElseThrow();
        String month = ZonedDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("yyyyMM"));
        redis.opsForValue().set("quota:" + key.getId() + ":" + month, "500");

        mockMvc.perform(get("/v1/countries").header(HttpHeaders.AUTHORIZATION, bearer(quotaKey)))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.error.code").value("QUOTA_EXCEEDED"));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static String bearer(String key) {
        return "Bearer " + key;
    }

    private Country saveCountry(String iso2, String iso3, String name, boolean ibanSupported) {
        Country country = new Country();
        country.setIso2(iso2);
        country.setIso3(iso3);
        country.setNameEn(name);
        country.setIbanSupported(ibanSupported);
        return countryRepository.save(country);
    }

    private FinancialInstitution saveInstitution(String legalName, String nameEn, String nameLocal,
                                                 String shortName, Country country, String website) {
        FinancialInstitution institution = new FinancialInstitution();
        institution.setLegalName(legalName);
        institution.setNameEn(nameEn);
        institution.setNameLocal(nameLocal);
        institution.setShortName(shortName);
        institution.setCountryId(country.getId());
        institution.setInstitutionType(InstitutionType.BANK);
        institution.setWebsite(website);
        return institutionRepository.save(institution);
    }

    private void saveIdentifier(Long institutionId, Long branchId, IdentifierType type, String value, Country country) {
        BankIdentifier identifier = new BankIdentifier();
        identifier.setInstitutionId(institutionId);
        identifier.setBranchId(branchId);
        identifier.setIdentifierType(type);
        identifier.setIdentifierValue(value);
        identifier.setCountryCode(country.getIso2());
        identifierRepository.save(identifier);
    }
}
