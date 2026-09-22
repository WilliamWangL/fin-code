package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.IbanCountryFormat;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IbanCountryFormatRepository extends JpaRepository<IbanCountryFormat, Long> {

    Optional<IbanCountryFormat> findByCountryCodeAndVersion(String countryCode, String version);

    List<IbanCountryFormat> findByCountryCode(String countryCode);
}
