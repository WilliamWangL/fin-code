package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.BankSwiftCodeDirectory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankSwiftCodeDirectoryRepository extends JpaRepository<BankSwiftCodeDirectory, Long> {

    Optional<BankSwiftCodeDirectory> findBySwiftCode(String swiftCode);
}
