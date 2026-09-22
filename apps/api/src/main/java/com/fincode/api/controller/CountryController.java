package com.fincode.api.controller;

import com.fincode.api.application.service.CountryQueryService;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.CountryDtos.CountryData;
import com.fincode.api.dto.IbanDtos.IbanFormatData;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Country reference endpoints (spec §28, FIN-005): list, single country and
 * per-country IBAN format.
 */
@RestController
@RequestMapping("/v1/countries")
public class CountryController {

    private final CountryQueryService countryQueryService;

    public CountryController(CountryQueryService countryQueryService) {
        this.countryQueryService = countryQueryService;
    }

    @GetMapping
    public ApiResponse<List<CountryData>> list() {
        return ApiResponse.of(countryQueryService.list());
    }

    @GetMapping("/{code}")
    public ApiResponse<CountryData> get(@PathVariable String code) {
        return ApiResponse.of(countryQueryService.get(code));
    }

    @GetMapping("/{code}/iban-format")
    public ApiResponse<IbanFormatData> ibanFormat(@PathVariable String code) {
        return ApiResponse.of(countryQueryService.ibanFormat(code));
    }
}
