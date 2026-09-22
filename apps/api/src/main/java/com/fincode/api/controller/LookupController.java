package com.fincode.api.controller;

import com.fincode.api.application.service.LookupService;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.LookupDtos.LookupData;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Universal lookup endpoint (spec §29, FIN-011): detects the identifier type,
 * resolves it and returns candidates when it cannot be resolved.
 */
@RestController
@RequestMapping("/v1")
public class LookupController {

    private final LookupService lookupService;

    public LookupController(LookupService lookupService) {
        this.lookupService = lookupService;
    }

    @GetMapping("/lookup")
    public ApiResponse<LookupData> lookup(@RequestParam String q) {
        return ApiResponse.of(lookupService.lookup(q));
    }
}
