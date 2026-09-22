package com.fincode.api.dto;

import com.fincode.api.exception.ErrorCode;
import com.fincode.api.exception.RequestContext;

/**
 * Unified error envelope: {"error": {"code", "message", "request_id"}} (spec §25).
 */
public record ApiErrorResponse(ApiError error) {

    public record ApiError(String code, String message, String requestId) {
    }

    public static ApiErrorResponse of(ErrorCode code) {
        return of(code, code.defaultMessage());
    }

    public static ApiErrorResponse of(ErrorCode code, String message) {
        String resolved = message != null ? message : code.defaultMessage();
        return new ApiErrorResponse(new ApiError(code.name(), resolved, RequestContext.requestId()));
    }
}
