package com.fincode.api.exception;

/**
 * Business exception carrying a unified ErrorCode. Handled by
 * {@link GlobalExceptionHandler} and rendered as the standard error envelope.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode) {
        super(errorCode.defaultMessage());
        this.errorCode = errorCode;
    }

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode errorCode() {
        return errorCode;
    }
}
