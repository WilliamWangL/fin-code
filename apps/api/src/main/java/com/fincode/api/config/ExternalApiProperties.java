package com.fincode.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Third-party enrichment APIs backing the bank directories (spec §68). Keys
 * come from the environment and never from Git; an empty key simply keeps the
 * matching fallback disabled.
 */
@Component
@ConfigurationProperties(prefix = "fincode.external")
public class ExternalApiProperties {

    /** api-ninjas.com X-Api-Key used by the SWIFT directory fallback lookup. */
    private String apiNinjasKey;

    /** True when the api-ninjas.com key is present. */
    public boolean isApiNinjasConfigured() {
        return apiNinjasKey != null && !apiNinjasKey.isBlank();
    }

    public String getApiNinjasKey() {
        return apiNinjasKey;
    }

    public void setApiNinjasKey(String apiNinjasKey) {
        this.apiNinjasKey = apiNinjasKey;
    }
}
