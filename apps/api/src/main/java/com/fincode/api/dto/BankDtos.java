package com.fincode.api.dto;

import com.fincode.api.dto.CommonDtos.IdentifierRef;
import java.util.List;

/**
 * Bank directory payloads (spec §27).
 */
public final class BankDtos {

    private BankDtos() {
    }

    /** Compact row used by /v1/banks and /v1/banks/search. */
    public record BankListItem(String id, String nameEn, String nameLocal, String shortName, String country,
                               List<IdentifierRef> identifiers) {
    }

    /** Full record used by /v1/banks/{id}. */
    public record BankDetailData(String id, String nameEn, String nameLocal, String shortName, String country,
                                 String website, String status, List<IdentifierRef> identifiers) {
    }

    public record BranchData(String id, String branchName, String branchNameEn, String address, String city,
                             String state, String province, String postalCode, String status) {
    }
}
