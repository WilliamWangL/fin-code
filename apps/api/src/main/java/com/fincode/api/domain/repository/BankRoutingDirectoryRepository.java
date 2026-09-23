package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.BankRoutingDirectory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankRoutingDirectoryRepository extends JpaRepository<BankRoutingDirectory, Integer> {

    Optional<BankRoutingDirectory> findByRoutingNumber(String routingNumber);
}
