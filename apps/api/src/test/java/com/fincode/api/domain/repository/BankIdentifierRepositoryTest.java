package com.fincode.api.domain.repository;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fincode.api.TestcontainersConfiguration;
import com.fincode.api.domain.enums.IdentifierType;
import com.fincode.api.domain.model.BankIdentifier;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.FinancialInstitution;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import com.fincode.api.domain.enums.InstitutionType;

/**
 * The global uniqueness rule of (identifier_type, identifier_value) — spec §22.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class BankIdentifierRepositoryTest {

    @Autowired
    private CountryRepository countryRepository;

    @Autowired
    private FinancialInstitutionRepository institutionRepository;

    @Autowired
    private BankIdentifierRepository identifierRepository;

    @Test
    void duplicateIdentifierTypeAndValueIsRejected() {
        Country country = new Country();
        country.setIso2("CN");
        country.setIso3("CHN");
        country.setNameEn("China");
        country = countryRepository.saveAndFlush(country);

        FinancialInstitution institution = new FinancialInstitution();
        institution.setLegalName("Industrial and Commercial Bank of China");
        institution.setCountryId(country.getId());
        institution.setInstitutionType(InstitutionType.BANK);
        institution = institutionRepository.saveAndFlush(institution);

        BankIdentifier first = new BankIdentifier();
        first.setInstitutionId(institution.getId());
        first.setIdentifierType(IdentifierType.SWIFT);
        first.setIdentifierValue("ICBKCNBJXXX");
        identifierRepository.saveAndFlush(first);

        BankIdentifier duplicate = new BankIdentifier();
        duplicate.setInstitutionId(institution.getId());
        duplicate.setIdentifierType(IdentifierType.SWIFT);
        duplicate.setIdentifierValue("ICBKCNBJXXX");

        assertThatThrownBy(() -> identifierRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
