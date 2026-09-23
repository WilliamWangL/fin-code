package com.fincode.api.mapper;

import com.fincode.api.domain.model.BankBranch;
import com.fincode.api.domain.model.BankRoutingDirectory;
import com.fincode.api.domain.model.BankSwiftCodeDirectory;
import com.fincode.api.domain.model.Country;
import com.fincode.api.domain.model.DataSource;
import com.fincode.api.domain.model.FinancialInstitution;
import com.fincode.api.domain.service.ResolvedIdentifier;
import com.fincode.api.domain.service.SwiftValidator;
import com.fincode.api.dto.BankDtos.BranchData;
import com.fincode.api.dto.CommonDtos.BankSummary;
import com.fincode.api.dto.CommonDtos.SourceInfo;
import com.fincode.api.dto.IdentifierDtos.BsbData;
import com.fincode.api.dto.IdentifierDtos.CnapsData;
import com.fincode.api.dto.IdentifierDtos.IfscData;
import com.fincode.api.dto.IdentifierDtos.RoutingData;
import com.fincode.api.dto.IdentifierDtos.SortCodeData;
import com.fincode.api.dto.IdentifierDtos.SwiftData;
import com.fincode.api.dto.IdentifierDtos.SwiftFormat;

/**
 * Maps resolved domain records to the API response payloads (spec §26).
 * The "inst_" id prefix mirrors the public documentation examples.
 */
public final class IdentifierMapper {

    private IdentifierMapper() {
    }

    public static String publicBankId(Long id) {
        return id == null ? null : "inst_" + id;
    }

    public static BankSummary toBankSummary(FinancialInstitution institution, Country country) {
        if (institution == null) {
            return null;
        }
        return new BankSummary(
                publicBankId(institution.getId()),
                institution.getNameEn(),
                institution.getNameLocal(),
                institution.getShortName(),
                country != null ? country.getIso2() : null,
                institution.getWebsite());
    }

    public static SourceInfo toSourceInfo(DataSource source) {
        if (source == null) {
            return null;
        }
        return new SourceInfo(
                source.getName(),
                source.getSourceType() != null ? source.getSourceType().name() : null,
                source.getRetrievedAt() != null ? source.getRetrievedAt().toLocalDate() : null);
    }

    public static SwiftData toSwiftData(ResolvedIdentifier resolved) {
        SwiftFormat format = SwiftValidator.parse(resolved.identifier().getIdentifierValue()) instanceof SwiftValidator.Parts parts
                ? new SwiftFormat(parts.institutionCode(), parts.countryCode(), parts.locationCode(), parts.branchCode())
                : null;
        return new SwiftData(
                resolved.identifier().getIdentifierValue(),
                resolved.identifier().getIdentifierValue(),
                format,
                toBankSummary(resolved.institution(), resolved.country()),
                branchCity(resolved.branch()),
                resolved.identifier().getStatus().name(),
                toSourceInfo(resolved.source()));
    }

    public static RoutingData toRoutingData(ResolvedIdentifier resolved) {
        return new RoutingData(
                resolved.identifier().getIdentifierValue(),
                true,
                toBankSummary(resolved.institution(), resolved.country()),
                branchCity(resolved.branch()),
                branchState(resolved.branch()),
                resolved.identifier().getStatus().name(),
                toSourceInfo(resolved.source()));
    }

    /**
     * Maps a bank_swift_code_directory row (GET /v1/swift/{code} backend).
     * The directory is self-contained: no institution/source join, and entries
     * are treated as active directory records.
     */
    public static SwiftData toSwiftData(BankSwiftCodeDirectory row) {
        SwiftFormat format = SwiftValidator.parse(row.getSwiftCode()) instanceof SwiftValidator.Parts parts
                ? new SwiftFormat(parts.institutionCode(), parts.countryCode(), parts.locationCode(), parts.branchCode())
                : null;
        return new SwiftData(
                row.getSwiftCode(),
                row.getSwiftCode(),
                format,
                directorySummary(row.getBankName(), row.getCountryCode()),
                row.getCity(),
                "ACTIVE",
                null);
    }

    /** Maps a bank_routing_directory row (GET /v1/routing/{number} backend). */
    public static RoutingData toRoutingData(BankRoutingDirectory row) {
        return new RoutingData(
                row.getRoutingNumber(),
                Boolean.TRUE.equals(row.getChecksumValid()),
                directorySummary(row.getBankName(), null),
                row.getCity(),
                row.getState(),
                "ACTIVE",
                null);
    }

    private static BankSummary directorySummary(String bankName, String countryIso2) {
        return new BankSummary(null, bankName, null, null, countryIso2, null);
    }

    public static SortCodeData toSortCodeData(ResolvedIdentifier resolved) {
        return new SortCodeData(
                resolved.identifier().getIdentifierValue(),
                com.fincode.api.domain.service.IdentifierFormatValidator.format(
                        com.fincode.api.domain.enums.IdentifierType.SORT_CODE,
                        resolved.identifier().getIdentifierValue()),
                toBankSummary(resolved.institution(), resolved.country()),
                branchCity(resolved.branch()),
                resolved.identifier().getStatus().name(),
                toSourceInfo(resolved.source()));
    }

    public static BsbData toBsbData(ResolvedIdentifier resolved) {
        return new BsbData(
                resolved.identifier().getIdentifierValue(),
                com.fincode.api.domain.service.IdentifierFormatValidator.format(
                        com.fincode.api.domain.enums.IdentifierType.BSB,
                        resolved.identifier().getIdentifierValue()),
                toBankSummary(resolved.institution(), resolved.country()),
                branchCity(resolved.branch()),
                branchState(resolved.branch()),
                resolved.identifier().getStatus().name(),
                toSourceInfo(resolved.source()));
    }

    public static IfscData toIfscData(ResolvedIdentifier resolved) {
        return new IfscData(
                resolved.identifier().getIdentifierValue(),
                toBankSummary(resolved.institution(), resolved.country()),
                branchName(resolved.branch()),
                branchCity(resolved.branch()),
                resolved.identifier().getStatus().name(),
                toSourceInfo(resolved.source()));
    }

    public static CnapsData toCnapsData(ResolvedIdentifier resolved) {
        String cnaps = resolved.identifier().getIdentifierValue();
        return new CnapsData(
                cnaps,
                cnaps.length() >= 3 ? cnaps.substring(0, 3) : null,
                toBankSummary(resolved.institution(), resolved.country()),
                branchName(resolved.branch()),
                branchCity(resolved.branch()),
                resolved.identifier().getStatus().name(),
                toSourceInfo(resolved.source()));
    }

    public static BranchData toBranchData(BankBranch branch) {
        return new BranchData(
                "br_" + branch.getId(),
                branch.getBranchName(),
                branch.getBranchNameEn(),
                branch.getAddress(),
                branch.getCity(),
                branch.getState(),
                branch.getProvince(),
                branch.getPostalCode(),
                branch.getStatus().name());
    }

    private static String branchCity(BankBranch branch) {
        return branch != null ? branch.getCity() : null;
    }

    private static String branchState(BankBranch branch) {
        return branch != null ? branch.getState() : null;
    }

    private static String branchName(BankBranch branch) {
        if (branch == null) {
            return null;
        }
        return branch.getBranchNameEn() != null ? branch.getBranchNameEn() : branch.getBranchName();
    }
}
