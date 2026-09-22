package com.fincode.api.domain.repository;

import com.fincode.api.domain.enums.EntityStatus;
import com.fincode.api.domain.model.Country;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CountryRepository extends JpaRepository<Country, Long> {

    Optional<Country> findByIso2(String iso2);

    Optional<Country> findByIso3(String iso3);

    List<Country> findByStatusOrderByNameEnAsc(EntityStatus status);
}
