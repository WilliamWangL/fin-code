package com.fincode.api.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fincode.api.config.ExternalApiProperties;
import com.fincode.api.domain.model.BankSwiftCodeDirectory;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * External SWIFT directory lookups backing GET /v1/swift/{code} when the local
 * bank_swift_code_directory has no row: the Wise public validator first, then
 * api-ninjas.com. Both are best-effort enrichment sources - a miss or a
 * provider/network failure returns empty and never surfaces as an API error.
 */
@Component
public class SwiftLookupClient {

    private static final Logger log = LoggerFactory.getLogger(SwiftLookupClient.class);

    private final ExternalApiProperties properties;
    private final RestClient wiseClient;
    private final RestClient apiNinjasClient;

    public SwiftLookupClient(ExternalApiProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.wiseClient = restClientBuilder.clone().baseUrl("https://wise.com").build();
        this.apiNinjasClient = restClientBuilder.clone().baseUrl("https://api.api-ninjas.com").build();
    }

    /**
     * Wise validator (https://wise.com/swift/api/validate). 8-character head
     * office codes are also tried with the XXX branch suffix; the returned row
     * keeps the code the caller asked for.
     */
    public Optional<BankSwiftCodeDirectory> lookupWise(String swiftCode) {
        String[] codesToTry = swiftCode.length() == 8
                ? new String[] { swiftCode, swiftCode + "XXX" }
                : new String[] { swiftCode };
        for (String candidate : codesToTry) {
            try {
                JsonNode node = wiseClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/swift/api/validate")
                                .queryParam("code", candidate)
                                .build())
                        .retrieve()
                        .body(JsonNode.class);
                if (node != null && node.hasNonNull("id")) {
                    BankSwiftCodeDirectory row = new BankSwiftCodeDirectory();
                    // Always store the code the caller asked about.
                    row.setSwiftCode(swiftCode);
                    row.setBankName(text(node, "name"));
                    row.setAddress(text(node, "addressLine1"));
                    row.setCity(text(node, "townName"));
                    row.setPostalCode(text(node, "postCode"));
                    row.setCountryCode(text(node, "countryCode"));
                    return Optional.of(row);
                }
            } catch (RestClientResponseException exception) {
                log.warn("Wise SWIFT lookup rejected code {}: status={}",
                        candidate, exception.getStatusCode().value());
            } catch (ResourceAccessException exception) {
                log.warn("Wise SWIFT lookup is unreachable for code {}: {}", candidate, exception.getMessage());
            }
        }
        return Optional.empty();
    }

    /** api-ninjas.com /v1/swiftcode; skipped while no API key is configured. */
    public Optional<BankSwiftCodeDirectory> lookupApiNinjas(String swiftCode) {
        if (!properties.isApiNinjasConfigured()) {
            return Optional.empty();
        }
        try {
            JsonNode array = apiNinjasClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/swiftcode")
                            .queryParam("swift", swiftCode)
                            .build())
                    .header("X-Api-Key", properties.getApiNinjasKey())
                    .retrieve()
                    .body(JsonNode.class);
            if (array != null && array.isArray() && !array.isEmpty()) {
                JsonNode obj = array.get(0);
                BankSwiftCodeDirectory row = new BankSwiftCodeDirectory();
                row.setSwiftCode(text(obj, "swift_code"));
                row.setBankName(text(obj, "bank_name"));
                row.setAddress(text(obj, "address"));
                row.setCity(text(obj, "city"));
                row.setRegion(text(obj, "region"));
                row.setPostalCode(text(obj, "postal_code"));
                row.setCountry(text(obj, "country"));
                row.setCountryCode(text(obj, "country_code"));
                return Optional.of(row);
            }
        } catch (RestClientResponseException exception) {
            log.warn("api-ninjas SWIFT lookup rejected code {}: status={}",
                    swiftCode, exception.getStatusCode().value());
        } catch (ResourceAccessException exception) {
            log.warn("api-ninjas SWIFT lookup is unreachable for code {}: {}",
                    swiftCode, exception.getMessage());
        }
        return Optional.empty();
    }

    private static String text(JsonNode node, String field) {
        String value = node.path(field).asText(null);
        return value == null || value.isBlank() ? null : value;
    }
}
