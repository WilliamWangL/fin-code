package com.fincode.api.controller;

import com.fincode.api.application.service.BankQueryService;
import com.fincode.api.application.service.Paged;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.BankDtos.BankDetailData;
import com.fincode.api.dto.BankDtos.BankListItem;
import com.fincode.api.dto.BankDtos.BranchData;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Bank directory endpoints (spec §27, FIN-006): list, search, detail and
 * branches, with cursor pagination.
 */
@RestController
@RequestMapping("/v1/banks")
public class BankController {

    private final BankQueryService bankQueryService;

    public BankController(BankQueryService bankQueryService) {
        this.bankQueryService = bankQueryService;
    }

    @GetMapping
    public ApiResponse<List<BankListItem>> list(@RequestParam(required = false) String country,
                                                @RequestParam(required = false) String cursor,
                                                @RequestParam(required = false) Integer limit) {
        Paged<List<BankListItem>> page = bankQueryService.list(country, cursor, limit);
        return ApiResponse.paged(page.data(), page.nextCursor());
    }

    @GetMapping("/search")
    public ApiResponse<List<BankListItem>> search(@RequestParam String q,
                                                  @RequestParam(required = false) String country,
                                                  @RequestParam(required = false) String cursor,
                                                  @RequestParam(required = false) Integer limit) {
        Paged<List<BankListItem>> page = bankQueryService.search(q, country, cursor, limit);
        return ApiResponse.paged(page.data(), page.nextCursor());
    }

    @GetMapping("/{id}")
    public ApiResponse<BankDetailData> get(@PathVariable String id) {
        return ApiResponse.of(bankQueryService.get(id));
    }

    @GetMapping("/{id}/branches")
    public ApiResponse<List<BranchData>> branches(@PathVariable String id,
                                                  @RequestParam(required = false) String cursor,
                                                  @RequestParam(required = false) Integer limit) {
        Paged<List<BranchData>> page = bankQueryService.branches(id, cursor, limit);
        return ApiResponse.paged(page.data(), page.nextCursor());
    }
}
