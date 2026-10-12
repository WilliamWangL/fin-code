package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.IbanBankCodeMap;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IbanBankCodeMapRepository extends JpaRepository<IbanBankCodeMap, Long> {

    Optional<IbanBankCodeMap> findByCountryCodeAndBankCode(String countryCode, String bankCode);
}
