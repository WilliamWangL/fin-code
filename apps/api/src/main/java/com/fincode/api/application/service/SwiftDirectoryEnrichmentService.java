package com.fincode.api.application.service;

import com.fincode.api.client.SwiftLookupClient;
import com.fincode.api.domain.model.BankSwiftCodeDirectory;
import com.fincode.api.domain.repository.BankSwiftCodeDirectoryRepository;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Enriches the SWIFT directory with external providers: when the local
 * bank_swift_code_directory has no row, Wise (preferred) and then
 * api-ninjas.com are queried and any hit is persisted for future lookups.
 * The write runs in its own transaction because callers sit inside read-only
 * query transactions.
 */
@Service
public class SwiftDirectoryEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(SwiftDirectoryEnrichmentService.class);

    private final BankSwiftCodeDirectoryRepository swiftDirectoryRepository;
    private final SwiftLookupClient swiftLookupClient;

    public SwiftDirectoryEnrichmentService(BankSwiftCodeDirectoryRepository swiftDirectoryRepository,
                                           SwiftLookupClient swiftLookupClient) {
        this.swiftDirectoryRepository = swiftDirectoryRepository;
        this.swiftLookupClient = swiftLookupClient;
    }

    /** Looks the code up externally and saves the hit, or empty when unknown everywhere. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<BankSwiftCodeDirectory> lookupAndPersist(String swiftCode) {
        Optional<BankSwiftCodeDirectory> found = swiftLookupClient.lookupWise(swiftCode)
                .or(() -> swiftLookupClient.lookupApiNinjas(swiftCode));
        found.ifPresent(row -> {
            swiftDirectoryRepository.save(row);
            log.info("Persisted SWIFT directory row {} from an external provider", swiftCode);
        });
        return found;
    }
}
