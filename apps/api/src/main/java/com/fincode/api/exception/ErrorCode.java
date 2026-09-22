package com.fincode.api.exception;

import org.springframework.http.HttpStatus;

/**
 * Unified API error codes (spec §25, §57). Codes and HTTP statuses mirror the
 * published documentation so client SDKs can rely on a stable contract.
 */
public enum ErrorCode {

    MISSING_PARAMETER(HttpStatus.BAD_REQUEST, "A required parameter is missing"),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "The request is malformed"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Missing or invalid API key"),
    API_KEY_EXPIRED(HttpStatus.UNAUTHORIZED, "The API key has expired or been revoked"),
    QUOTA_EXCEEDED(HttpStatus.PAYMENT_REQUIRED, "Monthly request quota exhausted"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "The identifier does not exist in the dataset"),
    INVALID_IBAN(HttpStatus.UNPROCESSABLE_ENTITY, "The IBAN failed format, checksum or structure validation"),
    IBAN_UNSUPPORTED_COUNTRY(HttpStatus.UNPROCESSABLE_ENTITY, "The country does not participate in IBAN"),
    INVALID_SWIFT(HttpStatus.UNPROCESSABLE_ENTITY, "The code is not a valid 8 or 11 character BIC"),
    INVALID_ROUTING(HttpStatus.UNPROCESSABLE_ENTITY, "The number is not 9 digits or fails the checksum"),
    INVALID_SORT_CODE(HttpStatus.UNPROCESSABLE_ENTITY, "The code is not 6 digits"),
    INVALID_BSB(HttpStatus.UNPROCESSABLE_ENTITY, "The code is not 6 digits"),
    INVALID_IFSC(HttpStatus.UNPROCESSABLE_ENTITY, "The code is not a valid 11-character IFSC"),
    INVALID_CNAPS(HttpStatus.UNPROCESSABLE_ENTITY, "The code is not 12 digits"),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "Rate limit exceeded - retry after the indicated delay"),

    // Portal / developer account codes (FIN-003, FIN-004)
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "The email or password is incorrect"),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "The token is invalid, expired or already used"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Insufficient permissions for this operation"),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "An account with this email already exists"),
    MEMBER_ALREADY_EXISTS(HttpStatus.CONFLICT, "The user is already a member of this organization"),

    // Subscription billing with PayPal (FIN-019)
    BILLING_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "Subscription billing is not configured"),
    PAYMENT_PROVIDER_ERROR(HttpStatus.BAD_GATEWAY, "The payment provider request failed"),
    PLAN_NOT_PURCHASABLE(HttpStatus.BAD_REQUEST, "The plan is not available for online purchase"),
    SUBSCRIPTION_ALREADY_ACTIVE(HttpStatus.CONFLICT, "The organization already has an active subscription"),
    INVALID_WEBHOOK_SIGNATURE(HttpStatus.UNAUTHORIZED, "The webhook signature could not be verified"),

    INTERNAL(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error - retry with backoff");

    private final HttpStatus httpStatus;
    private final String defaultMessage;

    ErrorCode(HttpStatus httpStatus, String defaultMessage) {
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus httpStatus() {
        return httpStatus;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
