package com.fincode.api.controller;

import com.fincode.api.application.service.IdentifierQueryService;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.IdentifierDtos.BsbData;
import com.fincode.api.dto.IdentifierDtos.CnapsData;
import com.fincode.api.dto.IdentifierDtos.IfscData;
import com.fincode.api.dto.IdentifierDtos.RoutingData;
import com.fincode.api.dto.IdentifierDtos.SortCodeData;
import com.fincode.api.dto.IdentifierDtos.SwiftData;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Typed identifier endpoints (spec §26, FIN-007): SWIFT, ABA routing, UK sort
 * code, Australian BSB, Indian IFSC and Chinese CNAPS.
 */
@RestController
@RequestMapping("/v1")
public class IdentifierController {

    private final IdentifierQueryService identifierQueryService;

    public IdentifierController(IdentifierQueryService identifierQueryService) {
        this.identifierQueryService = identifierQueryService;
    }

    @GetMapping("/swift/{code}")
    public ApiResponse<SwiftData> swift(@PathVariable String code) {
        return ApiResponse.of(identifierQueryService.findSwift(code));
    }

    @GetMapping("/routing/{number}")
    public ApiResponse<RoutingData> routing(@PathVariable String number) {
        return ApiResponse.of(identifierQueryService.findRouting(number));
    }

    @GetMapping("/sort-code/{code}")
    public ApiResponse<SortCodeData> sortCode(@PathVariable String code) {
        return ApiResponse.of(identifierQueryService.findSortCode(code));
    }

    @GetMapping("/bsb/{code}")
    public ApiResponse<BsbData> bsb(@PathVariable String code) {
        return ApiResponse.of(identifierQueryService.findBsb(code));
    }

    @GetMapping("/ifsc/{code}")
    public ApiResponse<IfscData> ifsc(@PathVariable String code) {
        return ApiResponse.of(identifierQueryService.findIfsc(code));
    }

    @GetMapping("/cnaps/{code}")
    public ApiResponse<CnapsData> cnaps(@PathVariable String code) {
        return ApiResponse.of(identifierQueryService.findCnaps(code));
    }
}
