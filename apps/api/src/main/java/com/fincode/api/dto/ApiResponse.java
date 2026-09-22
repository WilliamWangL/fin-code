package com.fincode.api.dto;

import com.fincode.api.exception.RequestContext;

/**
 * Unified success envelope: {"data": ..., "meta": {"request_id": "req_xxx"}} (spec §25).
 */
public record ApiResponse<T>(T data, ApiMeta meta) {

    public static <T> ApiResponse<T> of(T data) {
        return new ApiResponse<>(data, ApiMeta.of(RequestContext.requestId()));
    }

    public static <T> ApiResponse<T> paged(T data, String nextCursor) {
        return new ApiResponse<>(data, ApiMeta.paged(RequestContext.requestId(), nextCursor));
    }
}
