package com.fincode.api.config;

import com.fincode.api.application.service.UsageService;
import com.fincode.api.domain.model.ApiKey;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Persists a usage row for every authenticated request (spec §44, FIN-015),
 * including status code and latency. Never stores financial payloads.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 30)
public class UsageLogFilter extends OncePerRequestFilter {

    private final UsageService usageService;

    public UsageLogFilter(UsageService usageService) {
        this.usageService = usageService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            Object attribute = request.getAttribute(ApiKeyAuthFilter.ATTRIBUTE);
            if (attribute instanceof ApiKey apiKey) {
                long elapsedMs = (System.nanoTime() - start) / 1_000_000;
                usageService.recordSafely(apiKey, request.getRequestURI(), request.getMethod(),
                        response.getStatus(), elapsedMs);
            }
        }
    }
}
