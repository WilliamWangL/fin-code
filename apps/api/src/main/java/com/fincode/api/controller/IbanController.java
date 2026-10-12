package com.fincode.api.controller;

import com.fincode.api.application.service.IbanValidationService;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.IbanDtos.IbanLookupData;
import com.fincode.api.dto.IbanDtos.IbanValidateData;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * IBAN validation and local-first lookup endpoints (spec §26, FIN-008).
 */
@RestController
@RequestMapping("/v1/iban")
public class IbanController {

    private final IbanValidationService ibanValidationService;

    public IbanController(IbanValidationService ibanValidationService) {
        this.ibanValidationService = ibanValidationService;
    }

    @GetMapping("/validate")
    public ApiResponse<IbanValidateData> validate(@RequestParam String iban) {
        return ApiResponse.of(ibanValidationService.validate(iban));
    }

    /** Local-first IBAN lookup: the bank resolves from the local directory, external only on a miss. */
    @GetMapping("/{iban}")
    public ApiResponse<IbanLookupData> lookup(@PathVariable String iban) {
        return ApiResponse.of(ibanValidationService.findIban(iban));
    }
}
