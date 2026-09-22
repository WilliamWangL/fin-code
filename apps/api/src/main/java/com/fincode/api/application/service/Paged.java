package com.fincode.api.application.service;

/**
 * Internal cursor-pagination carrier: the page payload plus the cursor for the
 * next page (null when the current page is the last one). Cursors are the id of
 * the last row on the page, matching the opaque "cursor" query parameter.
 */
public record Paged<T>(T data, String nextCursor) {
}
