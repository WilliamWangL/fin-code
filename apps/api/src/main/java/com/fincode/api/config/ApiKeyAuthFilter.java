package com.fincode.api.config;

import com.fincode.api.application.service.ApiKeyService;
import com.fincode.api.domain.model.ApiKey;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Bearer authentication for data API paths under /v1/** (spec §24, FIN-014):
 * resolves the API key and stores it as a request attribute for downstream
 * filters and handlers. Portal paths (/v1/auth, /v1/organizations,
 * /v1/api-keys) are handled by {@link JwtAuthFilter} instead. Runs after
 * {@link RequestIdFilter} so the error envelope carries a request id.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    public static final String ATTRIBUTE = "apiKey";

    private static final Pattern BEARER = Pattern.compile("^Bearer\\s+(\\S+)$", Pattern.CASE_INSENSITIVE);
    private static final String V1_PREFIX = "/v1/";

    private final ApiKeyService apiKeyService;
    private final ErrorResponseWriter errorResponseWriter;

    public ApiKeyAuthFilter(ApiKeyService apiKeyService, ErrorResponseWriter errorResponseWriter) {
        this.apiKeyService = apiKeyService;
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith(V1_PREFIX) || ApiScopes.isPortalPath(path) || ApiScopes.isPublicPath(path)) {
            chain.doFilter(request, response);
            return;
        }
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        Matcher matcher = header == null ? null : BEARER.matcher(header);
        if (matcher == null || !matcher.matches()) {
            errorResponseWriter.write(response, ErrorCode.UNAUTHORIZED);
            return;
        }
        try {
            ApiKey apiKey = apiKeyService.authenticate(matcher.group(1));
            request.setAttribute(ATTRIBUTE, apiKey);
            chain.doFilter(request, response);
        } catch (ApiException exception) {
            errorResponseWriter.write(response, exception.errorCode(), exception.getMessage());
        }
    }
}
