package com.fincode.api.application.service;

import com.fincode.api.client.BankDirectoryLookupClient;
import com.fincode.api.domain.model.BankBinDirectory;
import com.fincode.api.domain.model.BankRoutingDirectory;
import com.fincode.api.domain.model.BankSwiftCodeDirectory;
import com.fincode.api.domain.repository.BankBinDirectoryRepository;
import com.fincode.api.domain.repository.BankRoutingDirectoryRepository;
import com.fincode.api.domain.repository.BankSwiftCodeDirectoryRepository;
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
 * queried and any hit is persisted for future lookups. The write runs in
 * its own transaction because callers sit inside read-only query
 * transactions.
 */
@Service
public class BankDirectoryEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(BankDirectoryEnrichmentService.class);

    private final BankSwiftCodeDirectoryRepository swiftDirectoryRepository;
    private final BankRoutingDirectoryRepository routingDirectoryRepository;
    private final BankBinDirectoryRepository binDirectoryRepository;
    private final BankDirectoryLookupClient lookupClient;

    public BankDirectoryEnrichmentService(BankSwiftCodeDirectoryRepository swiftDirectoryRepository,
                                          BankRoutingDirectoryRepository routingDirectoryRepository,
                                          BankBinDirectoryRepository binDirectoryRepository,
                                          BankDirectoryLookupClient lookupClient) {
        this.swiftDirectoryRepository = swiftDirectoryRepository;
        this.routingDirectoryRepository = routingDirectoryRepository;
        this.binDirectoryRepository = binDirectoryRepository;
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
}
