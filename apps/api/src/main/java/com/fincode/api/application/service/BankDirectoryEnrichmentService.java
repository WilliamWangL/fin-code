package com.fincode.api.application.service;

import com.fincode.api.client.BankDirectoryLookupClient;
import com.fincode.api.domain.model.BankBinDirectory;
import com.fincode.api.domain.model.BankRoutingDirectory;
import com.fincode.api.domain.model.BankSwiftCodeDirectory;
import com.fincode.api.domain.model.IbanBankCodeMap;
import com.fincode.api.domain.repository.BankBinDirectoryRepository;
import com.fincode.api.domain.repository.BankRoutingDirectoryRepository;
import com.fincode.api.domain.repository.BankSwiftCodeDirectoryRepository;
import com.fincode.api.domain.repository.IbanBankCodeMapRepository;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Enriches the bank directories with external providers: when the local
 * bank_swift_code_directory, bank_routing_directory or bank_bin_directory
 * has no row, Wise (SWIFT only, preferred) and then api-ninjas.com are
 * queried and any hit is persisted for future lookups. IBAN lookups
 * additionally persist the bank-code → SWIFT map. The write runs in
 * its own transaction because callers sit inside read-only query
 * transactions.
 */
@Service
public class BankDirectoryEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(BankDirectoryEnrichmentService.class);

    private final BankSwiftCodeDirectoryRepository swiftDirectoryRepository;
    private final BankRoutingDirectoryRepository routingDirectoryRepository;
    private final BankBinDirectoryRepository binDirectoryRepository;
    private final IbanBankCodeMapRepository ibanBankCodeMapRepository;
    private final BankDirectoryLookupClient lookupClient;

    public BankDirectoryEnrichmentService(BankSwiftCodeDirectoryRepository swiftDirectoryRepository,
                                          BankRoutingDirectoryRepository routingDirectoryRepository,
                                          BankBinDirectoryRepository binDirectoryRepository,
                                          IbanBankCodeMapRepository ibanBankCodeMapRepository,
                                          BankDirectoryLookupClient lookupClient) {
        this.swiftDirectoryRepository = swiftDirectoryRepository;
        this.routingDirectoryRepository = routingDirectoryRepository;
        this.binDirectoryRepository = binDirectoryRepository;
        this.ibanBankCodeMapRepository = ibanBankCodeMapRepository;
        this.lookupClient = lookupClient;
    }

    /** Looks the SWIFT code up externally and saves the hit, or empty when unknown everywhere. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<BankSwiftCodeDirectory> lookupAndPersistSwift(String swiftCode) {
        Optional<BankSwiftCodeDirectory> found = lookupClient.lookupWise(swiftCode)
                .or(() -> lookupClient.lookupApiNinjas(swiftCode));
        found.ifPresent(row -> {
            swiftDirectoryRepository.save(row);
            log.info("Persisted SWIFT directory row {} from an external provider", swiftCode);
        });
        return found;
    }

    /** Looks the routing number up externally and saves the hit, or empty when unknown everywhere. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<BankRoutingDirectory> lookupAndPersistRouting(String routingNumber) {
        Optional<BankRoutingDirectory> found = lookupClient.lookupRoutingApiNinjas(routingNumber);
        found.ifPresent(row -> {
            routingDirectoryRepository.save(row);
            log.info("Persisted routing directory row {} from an external provider", routingNumber);
        });
        return found;
    }

    /** Looks the card BIN up externally and saves the hit, or empty when unknown everywhere. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<BankBinDirectory> lookupAndPersistBin(String bin) {
        Optional<BankBinDirectory> found = lookupClient.lookupBinApiNinjas(bin);
        found.ifPresent(row -> {
            binDirectoryRepository.save(row);
            log.info("Persisted BIN directory row {} from an external provider", bin);
        });
        return found;
    }

    /**
     * Looks an IBAN's bank up externally and persists the hit twice: the
     * bank-code → SWIFT map row (so the next IBAN at the same bank resolves
     * locally) and the SWIFT directory row (so the mapped code serves the
     * bank details). Empty when the provider does not know the IBAN or marks
     * it invalid — a provider verdict never overrides the local checks.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<BankSwiftCodeDirectory> lookupAndPersistIban(String iban) {
        Optional<BankDirectoryLookupClient.IbanEnrichment> found = lookupClient.lookupIbanApiNinjas(iban);
        if (found.isEmpty() || !found.get().valid() || found.get().swiftCode() == null) {
            return Optional.empty();
        }
        BankDirectoryLookupClient.IbanEnrichment enrichment = found.get();
        if (enrichment.country() != null && enrichment.bankCode() != null) {
            String swiftCode = enrichment.swiftCode();
            ibanBankCodeMapRepository.findByCountryCodeAndBankCode(enrichment.country(), enrichment.bankCode())
                    .ifPresentOrElse(row -> row.setSwiftCode(swiftCode), () -> {
                        IbanBankCodeMap row = new IbanBankCodeMap();
                        row.setCountryCode(enrichment.country());
                        row.setBankCode(enrichment.bankCode());
                        row.setSwiftCode(swiftCode);
                        ibanBankCodeMapRepository.save(row);
                    });
            log.info("Persisted IBAN bank-code map {}:{} -> {}",
                    enrichment.country(), enrichment.bankCode(), swiftCode);
        }
        Optional<BankSwiftCodeDirectory> directory = swiftDirectoryRepository.findBySwiftCode(enrichment.swiftCode());
        if (directory.isEmpty()) {
            BankSwiftCodeDirectory row = new BankSwiftCodeDirectory();
            row.setSwiftCode(enrichment.swiftCode());
            row.setBankName(enrichment.bankName());
            row.setAddress(enrichment.bankAddress());
            row.setCountryCode(enrichment.country());
            directory = Optional.of(swiftDirectoryRepository.save(row));
            log.info("Persisted SWIFT directory row {} from an IBAN lookup", enrichment.swiftCode());
        }
        return directory;
    }
}
