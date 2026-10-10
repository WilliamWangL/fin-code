package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.BankBinDirectory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankBinDirectoryRepository extends JpaRepository<BankBinDirectory, Long> {

    Optional<BankBinDirectory> findByBin(String bin);
}
