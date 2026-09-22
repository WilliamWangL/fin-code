package com.fincode.api.controller;

import com.fincode.api.application.service.IbanValidationService;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.IbanDtos.IbanValidateData;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * IBAN validation endpoint (spec §26, FIN-008).
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
}
