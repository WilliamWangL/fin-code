package com.fincode.api.exception;

import org.slf4j.MDC;

/**
 * Access to the current request id (spec §2.9: every API call has a Request ID).
 */
public final class RequestContext {

    public static final String MDC_KEY = "requestId";

    private RequestContext() {
    }

    public static String requestId() {
        String requestId = MDC.get(MDC_KEY);
        return requestId != null ? requestId : "req_unknown";
    }
}
