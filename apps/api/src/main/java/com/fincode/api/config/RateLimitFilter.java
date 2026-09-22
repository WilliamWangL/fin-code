package com.fincode.api.config;

import com.fincode.api.application.service.RateLimitService;
import com.fincode.api.application.service.UsageService;
import com.fincode.api.domain.model.ApiKey;
import com.fincode.api.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rate limiting and monthly quota enforcement for authenticated calls
 * (spec §42, §43). Runs after {@link ApiKeyAuthFilter}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String HEADER_RATE_LIMIT = "X-RateLimit-Limit";
    private static final String HEADER_RATE_REMAINING = "X-RateLimit-Remaining";

    private final RateLimitService rateLimitService;
    private final UsageService usageService;
    private final ErrorResponseWriter errorResponseWriter;

    public RateLimitFilter(RateLimitService rateLimitService,
                           UsageService usageService,
                           ErrorResponseWriter errorResponseWriter) {
        this.rateLimitService = rateLimitService;
        this.usageService = usageService;
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Object attribute = request.getAttribute(ApiKeyAuthFilter.ATTRIBUTE);
        if (!(attribute instanceof ApiKey apiKey)) {
            chain.doFilter(request, response);
            return;
        }

        RateLimitService.Result result = rateLimitService.acquire(apiKey);
        if (!result.allowed()) {
            long retryAfterSeconds = Math.max(1, (result.retryAfterMs() + 999) / 1000);
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds));
            errorResponseWriter.write(response, ErrorCode.RATE_LIMITED);
            return;
        }
        if (!usageService.tryConsumeQuota(apiKey)) {
            errorResponseWriter.write(response, ErrorCode.QUOTA_EXCEEDED);
            return;
        }

        response.setHeader(HEADER_RATE_LIMIT, String.valueOf(apiKey.getPlan().requestsPerMinute()));
        response.setHeader(HEADER_RATE_REMAINING, String.valueOf(Math.max(result.remaining(), 0)));
        chain.doFilter(request, response);
    }
}
