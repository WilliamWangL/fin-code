package com.fincode.api.config;

import com.fincode.api.application.service.AuthPrincipal;
import com.fincode.api.application.service.JwtService;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * JWT authentication for the developer portal paths (FIN-003): /v1/auth (except
 * the public endpoints), /v1/organizations and /v1/api-keys. Data API paths are
 * guarded by {@link ApiKeyAuthFilter} instead.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 15)
public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String ATTRIBUTE = "authUser";

    private static final Pattern BEARER = Pattern.compile("^Bearer\\s+(\\S+)$", Pattern.CASE_INSENSITIVE);

    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/v1/auth/register",
            "/v1/auth/login",
            "/v1/auth/refresh",
            "/v1/auth/password-reset/request",
            "/v1/auth/password-reset/confirm");

    private final JwtService jwtService;
    private final ErrorResponseWriter errorResponseWriter;

    public JwtAuthFilter(JwtService jwtService, ErrorResponseWriter errorResponseWriter) {
        this.jwtService = jwtService;
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!ApiScopes.isPortalPath(path) || PUBLIC_PATHS.contains(path)) {
            chain.doFilter(request, response);
            return;
        }
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        Matcher matcher = header == null ? null : BEARER.matcher(header);
        if (matcher == null || !matcher.matches()) {
            errorResponseWriter.write(response, ErrorCode.UNAUTHORIZED, "Missing or invalid access token");
            return;
        }
        try {
            AuthPrincipal principal = jwtService.parse(matcher.group(1));
            request.setAttribute(ATTRIBUTE, principal);
            chain.doFilter(request, response);
        } catch (ApiException exception) {
            errorResponseWriter.write(response, exception.errorCode(), exception.getMessage());
        }
    }
}
