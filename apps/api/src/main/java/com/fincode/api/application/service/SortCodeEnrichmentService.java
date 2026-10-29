package com.fincode.api.application.service;

import com.fincode.api.client.BankDirectoryLookupClient;
import com.fincode.api.client.BankDirectoryLookupClient.SortCodeEnrichment;
import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.enums.IdentifierType;
import com.fincode.api.domain.enums.InstitutionType;
import com.fincode.api.domain.enums.SourceType;
import com.fincode.api.domain.model.BankBranch;
import com.fincode.api.domain.model.BankIdentifier;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.DataSource;
import com.fincode.api.domain.model.FinancialInstitution;
import com.fincode.api.domain.repository.BankBranchRepository;
import com.fincode.api.domain.repository.BankIdentifierRepository;
import com.fincode.api.domain.repository.CountryRepository;
import com.fincode.api.domain.repository.DataSourceRepository;
import com.fincode.api.domain.repository.FinancialInstitutionRepository;
import com.fincode.api.domain.service.ResolvedIdentifier;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fills a missing UK sort code from api-ninjas.com and stores the hit in the
 * relational directory (financial_institution / bank_branch / bank_identifier)
 * so the next identical lookup is served locally. Unlike the standalone
 * directory tables, sort codes are modelled as identifier rows, hence the
 * hand-written persistence here.
 *
 * <p>The write runs in its own transaction: callers sit inside a read-only
 * query transaction. Concurrent lookups of the same code are settled by the
 * (identifier_type, identifier_value) unique key — the loser re-reads the
 * winner's row.
 */
@Service
public class SortCodeEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(SortCodeEnrichmentService.class);

    /** Country the provider covers; every api-ninjas sort code is a UK code. */
    private static final String UK_ISO2 = "GB";

    /** data_source row identifying rows that were fetched rather than imported. */
    private static final String SOURCE_NAME = "api-ninjas.com";

    private final BankDirectoryLookupClient lookupClient;
    private final BankIdentifierRepository identifierRepository;
    private final FinancialInstitutionRepository institutionRepository;
    private final BankBranchRepository branchRepository;
    private final CountryRepository countryRepository;
    private final DataSourceRepository dataSourceRepository;

    public SortCodeEnrichmentService(BankDirectoryLookupClient lookupClient,
                                     BankIdentifierRepository identifierRepository,
                                     FinancialInstitutionRepository institutionRepository,
                                     BankBranchRepository branchRepository,
                                     CountryRepository countryRepository,
                                     DataSourceRepository dataSourceRepository) {
        this.lookupClient = lookupClient;
        this.identifierRepository = identifierRepository;
        this.institutionRepository = institutionRepository;
        this.branchRepository = branchRepository;
        this.countryRepository = countryRepository;
        this.dataSourceRepository = dataSourceRepository;
    }

    /** Looks the sort code up externally, persists the hit and returns the stored record. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<ResolvedIdentifier> lookupAndPersist(String sortCode) {
        Optional<SortCodeEnrichment> found = lookupClient.lookupSortCodeApiNinjas(sortCode);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        SortCodeEnrichment enrichment = found.get();
        Country country = countryRepository.findByIso2(UK_ISO2).orElse(null);
        if (country == null || enrichment.bankName() == null) {
            log.warn("Skipping sort code {} enrichment: no {} country row or no bank name in the payload",
                    sortCode, UK_ISO2);
            return Optional.empty();
        }
        // A concurrent request may have stored the code while the provider was
        // being asked; the stored row wins over the payload.
        Optional<BankIdentifier> stored = identifierRepository
                .findByIdentifierTypeAndIdentifierValue(IdentifierType.SORT_CODE, sortCode);
        if (stored.isPresent()) {
            return Optional.of(assemble(stored.get()));
        }

        DataSource source = apiNinjasSource();
        FinancialInstitution institution = institutionRepository
                .findFirstByNameEnIgnoreCaseAndCountryIdAndStatus(
                        enrichment.bankName(), country.getId(), EntityStatus.ACTIVE)
                .orElseGet(() -> institutionRepository.save(institutionRow(enrichment, country)));
        BankBranch branch = branchRepository.save(branchRow(enrichment, institution));
        try {
            BankIdentifier identifier = identifierRepository.saveAndFlush(
                    identifierRow(sortCode, enrichment, institution, branch, source));
            log.info("Persisted sort code {} ({}) from api-ninjas.com", sortCode, enrichment.bankName());
            return Optional.of(new ResolvedIdentifier(identifier, institution, country, branch, source));
        } catch (DataIntegrityViolationException exception) {
            // Unique key (identifier_type, identifier_value) settled the race; the
            // institution/branch rows created above are left in place and reused by
            // the next lookup of the same name.
            log.info("Sort code {} was stored concurrently; serving the existing row", sortCode);
            return identifierRepository
                    .findByIdentifierTypeAndIdentifierValue(IdentifierType.SORT_CODE, sortCode)
                    .map(this::assemble);
        }
    }

    private FinancialInstitution institutionRow(SortCodeEnrichment enrichment, Country country) {
        FinancialInstitution institution = new FinancialInstitution();
        institution.setLegalName(enrichment.bankName());
        institution.setNameEn(enrichment.bankName());
        institution.setShortName(truncate(enrichment.bankName(), 64));
        institution.setCountryId(country.getId());
        institution.setInstitutionType(InstitutionType.BANK);
        institution.setStatus(EntityStatus.ACTIVE);
        return institution;
    }

    private BankBranch branchRow(SortCodeEnrichment enrichment, FinancialInstitution institution) {
        BankBranch branch = new BankBranch();
        branch.setInstitutionId(institution.getId());
        branch.setBranchName(enrichment.branchName() != null
                ? truncate(enrichment.branchName(), 200)
                : "Sort code " + enrichment.sortCode());
        branch.setAddress(truncate(enrichment.streetAddress(), 300));
        branch.setCity(truncate(enrichment.city(), 100));
        branch.setPostalCode(truncate(enrichment.postcode(), 20));
        branch.setPhone(truncate(enrichment.phoneNumber(), 40));
        branch.setStatus(EntityStatus.ACTIVE);
        return branch;
    }

    private BankIdentifier identifierRow(String sortCode, SortCodeEnrichment enrichment,
                                         FinancialInstitution institution, BankBranch branch,
                                         DataSource source) {
        BankIdentifier identifier = new BankIdentifier();
        identifier.setInstitutionId(institution.getId());
        identifier.setBranchId(branch.getId());
        identifier.setIdentifierType(IdentifierType.SORT_CODE);
        identifier.setIdentifierValue(sortCode);
        identifier.setCountryCode(enrichment.country() != null ? enrichment.country() : UK_ISO2);
        identifier.setStatus(Boolean.FALSE.equals(enrichment.checksumValid())
                ? EntityStatus.INACTIVE
                : EntityStatus.ACTIVE);
        identifier.setSourceId(source.getId());
        identifier.setVerifiedAt(LocalDateTime.now());
        return identifier;
    }

    /**
     * The provenance row for provider-fetched codes. Kept conservative on
     * licensing: the payload is stored for serving lookups, redistribution is
     * not claimed.
     */
    private DataSource apiNinjasSource() {
        List<DataSource> existing = dataSourceRepository.findByName(SOURCE_NAME);
        if (!existing.isEmpty()) {
            return existing.get(0);
        }
        DataSource source = new DataSource();
        source.setName(SOURCE_NAME);
        source.setSourceType(SourceType.LICENSED);
        source.setProvider("api-ninjas.com");
        source.setSourceUrl("https://api-ninjas.com/api/sortcode");
        source.setLicense("Commercial API subscription");
        source.setCommercialUse(true);
        source.setRedistributionAllowed(false);
        source.setStorageAllowed(true);
        source.setRetrievedAt(LocalDateTime.now());
        source.setStatus(EntityStatus.ACTIVE);
        log.info("Registered data source {}", SOURCE_NAME);
        return dataSourceRepository.save(source);
    }

    private ResolvedIdentifier assemble(BankIdentifier identifier) {
        FinancialInstitution institution = institutionRepository.findById(identifier.getInstitutionId())
                .orElse(null);
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

    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
