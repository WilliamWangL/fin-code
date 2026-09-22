package com.fincode.api.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Browser origins allowed to call the API (FIN-017 developer portal). The
 * website signs in against /v1/auth from the browser, so CORS must be granted
 * per environment via CORS_ALLOWED_ORIGINS (spec §68).
 */
@Component
@ConfigurationProperties(prefix = "fincode.cors")
public class CorsProperties {

    private List<String> allowedOrigins = List.of("http://localhost:3000");

    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }
}
