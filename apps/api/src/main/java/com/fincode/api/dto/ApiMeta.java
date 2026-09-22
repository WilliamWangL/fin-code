package com.fincode.api.dto;

/**
 * Response metadata echoed on every call (spec §25): the request id and,
 * for cursor-paginated collections, the next page cursor.
 */
public record ApiMeta(String requestId, String nextCursor) {

    public static ApiMeta of(String requestId) {
        return new ApiMeta(requestId, null);
    }

    public static ApiMeta paged(String requestId, String nextCursor) {
        return new ApiMeta(requestId, nextCursor);
    }
}
