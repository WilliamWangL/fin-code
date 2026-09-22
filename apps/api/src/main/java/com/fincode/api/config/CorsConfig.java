package com.fincode.api.config;

import java.util.List;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * CORS for the developer portal (FIN-017): the website calls /v1/auth,
 * /v1/organizations, /v1/api-keys and /v1/usage from the browser with a Bearer
 * token. The filter runs before the authentication filters so preflight
 * OPTIONS requests (which carry no credentials) are answered without a 401.
 */
@Configuration
public class CorsConfig {

    private static final List<String> METHODS = List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");

    private static final List<String> HEADERS =
            List.of(HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE, HttpHeaders.ACCEPT, RequestIdFilter.HEADER);

    private static final List<String> EXPOSED_HEADERS = List.of(
            RequestIdFilter.HEADER,
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            HttpHeaders.RETRY_AFTER);

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilter(CorsProperties properties) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(properties.getAllowedOrigins());
        configuration.setAllowedMethods(METHODS);
        configuration.setAllowedHeaders(HEADERS);
        configuration.setExposedHeaders(EXPOSED_HEADERS);
        // Token auth via the Authorization header; no cookies cross origins.
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        FilterRegistrationBean<CorsFilter> registration = new FilterRegistrationBean<>(new CorsFilter(source));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}
