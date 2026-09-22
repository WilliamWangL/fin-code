package com.fincode.api.dto;

import com.fincode.api.dto.CommonDtos.BankSummary;
import com.fincode.api.dto.CommonDtos.SourceInfo;

/**
 * Response payloads of the typed identifier endpoints (spec §26).
 */
public final class IdentifierDtos {

    private IdentifierDtos() {
    }

    public record SwiftFormat(String institutionCode, String countryCode, String locationCode, String branchCode) {
    }

    public record SwiftData(String swiftCode, String bic, SwiftFormat format, BankSummary bank, String city,
                            String status, SourceInfo source) {
    }

    public record RoutingData(String routingNumber, boolean checksumValid, BankSummary bank, String city,
                              String state, String status, SourceInfo source) {
    }

    public record SortCodeData(String sortCode, String formatted, BankSummary bank, String city,
                               String status, SourceInfo source) {
    }

    public record BsbData(String bsb, String formatted, BankSummary bank, String city, String state,
                          String status, SourceInfo source) {
    }

    public record IfscData(String ifsc, BankSummary bank, String branch, String city, String status,
                           SourceInfo source) {
    }

    public record CnapsData(String cnaps, String bankCode, BankSummary bank, String branch, String city,
                            String status, SourceInfo source) {
    }
}
