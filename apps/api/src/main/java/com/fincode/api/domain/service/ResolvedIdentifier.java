package com.fincode.api.domain.service;

import com.fincode.api.domain.model.BankBranch;
import com.fincode.api.domain.model.BankIdentifier;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.DataSource;
import com.fincode.api.domain.model.FinancialInstitution;

/**
 * A fully resolved identifier: the identifier row plus every entity needed to
 * render an API response. Any component except identifier/institution may be null.
 */
public record ResolvedIdentifier(
        BankIdentifier identifier,
        FinancialInstitution institution,
        Country country,
        BankBranch branch,
        DataSource source) {
}
