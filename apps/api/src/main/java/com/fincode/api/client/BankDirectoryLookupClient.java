package com.fincode.api.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fincode.api.config.ExternalApiProperties;
import com.fincode.api.domain.model.BankBinDirectory;
import com.fincode.api.domain.model.BankRoutingDirectory;
import com.fincode.api.domain.model.BankSwiftCodeDirectory;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * External bank directory lookups backing GET /v1/swift/{code},
 * GET /v1/routing/{number} and GET /v1/bin/{bin} when the local directory
 * tables have no row: the Wise public validator first for SWIFT, then
 * api-ninjas.com for all three. These are best-effort enrichment sources -
 * a miss or a provider/network failure returns empty and never surfaces as
 * an API error.
 */
@Component
public class BankDirectoryLookupClient {

    private static final Logger log = LoggerFactory.getLogger(BankDirectoryLookupClient.class);

    private final ExternalApiProperties properties;
    private final RestClient wiseClient;
    private final RestClient apiNinjasClient;

    public BankDirectoryLookupClient(ExternalApiProperties properties, RestClient.Builder restClientBuilder) {
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

    /**
     * api-ninjas.com /v1/routingnumber backing GET /v1/routing/{number};
     * skipped while no API key is configured. The response also carries a
     * swift_code for the institution, which the routing directory has no
     * column for and is ignored.
     */
    public Optional<BankRoutingDirectory> lookupRoutingApiNinjas(String routingNumber) {
        if (!properties.isApiNinjasConfigured()) {
            return Optional.empty();
        }
        try {
            JsonNode array = apiNinjasClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/routingnumber")
                            .queryParam("routing_number", routingNumber)
                            .build())
                    .header("X-Api-Key", properties.getApiNinjasKey())
                    .retrieve()
                    .body(JsonNode.class);
            if (array != null && array.isArray() && !array.isEmpty()) {
                JsonNode obj = array.get(0);
                BankRoutingDirectory row = new BankRoutingDirectory();
                row.setRoutingNumber(text(obj, "routing_number"));
                row.setBankName(text(obj, "bank_name"));
                row.setStreetAddress(text(obj, "street_address"));
                row.setCity(text(obj, "city"));
                row.setState(text(obj, "state"));
                row.setZipCode(text(obj, "zip_code"));
                row.setCountry(text(obj, "country"));
                row.setCounty(text(obj, "county"));
                row.setTimezone(text(obj, "timezone"));
                row.setLatitude(decimal(obj, "latitude"));
                row.setLongitude(decimal(obj, "longitude"));
                row.setPhoneNumber(text(obj, "phone_number"));
                row.setAchSupported(bool(obj, "ach_supported"));
                row.setFedwireSupported(bool(obj, "fedwire_supported"));
                row.setChecksumValid(bool(obj, "checksum_valid"));
                return Optional.of(row);
            }
        } catch (RestClientResponseException exception) {
            log.warn("api-ninjas routing lookup rejected number {}: status={}",
                    routingNumber, exception.getStatusCode().value());
        } catch (ResourceAccessException exception) {
            log.warn("api-ninjas routing lookup is unreachable for number {}: {}",
                    routingNumber, exception.getMessage());
        }
        return Optional.empty();
    }

    /**
     * api-ninjas.com /v2/bin backing GET /v1/bin/{bin}; skipped while no API
     * key is configured. The row keeps the BIN the caller asked for so a local
     * hit serves the next identical lookup.
     */
    public Optional<BankBinDirectory> lookupBinApiNinjas(String bin) {
        if (!properties.isApiNinjasConfigured()) {
            return Optional.empty();
        }
        try {
            JsonNode array = apiNinjasClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v2/bin")
                            .queryParam("bin", bin)
                            .build())
                    .header("X-Api-Key", properties.getApiNinjasKey())
                    .retrieve()
                    .body(JsonNode.class);
            if (array != null && array.isArray() && !array.isEmpty()) {
                JsonNode obj = array.get(0);
                BankBinDirectory row = new BankBinDirectory();
                row.setBin(bin);
                row.setBrand(text(obj, "brand"));
                row.setType(text(obj, "type"));
                row.setCategories(categories(obj.path("categories")));
                row.setIssuer(text(obj, "issuer"));
                row.setCountry(text(obj, "country"));
                row.setCountryIso2(text(obj, "country_iso2"));
                row.setEu(bool(obj, "is_eu"));
                row.setEea(bool(obj, "is_eea"));
                row.setSepa(bool(obj, "is_sepa"));
                row.setValid(bool(obj, "is_valid"));
                return Optional.of(row);
            }
        } catch (RestClientResponseException exception) {
            log.warn("api-ninjas BIN lookup rejected {}: status={}", bin, exception.getStatusCode().value());
        } catch (ResourceAccessException exception) {
            log.warn("api-ninjas BIN lookup is unreachable for {}: {}", bin, exception.getMessage());
        }
        return Optional.empty();
    }

    /** The provider returns the card categories as an array of plain strings. */
    private static String categories(JsonNode array) {
        if (array == null || !array.isArray() || array.isEmpty()) {
            return null;
        }
        List<String> values = new ArrayList<>();
        for (JsonNode node : array) {
            String value = node.asText(null);
            if (value != null && !value.isBlank()) {
                values.add(value);
            }
        }
        return values.isEmpty() ? null : String.join(",", values);
    }

    private static String text(JsonNode node, String field) {
        String value = node.path(field).asText(null);
        return value == null || value.isBlank() ? null : value;
    }

    /** Numeric fields arrive as strings such as "37.6255". */
    private static BigDecimal decimal(JsonNode node, String field) {
        String value = text(node, field);
        if (value == null) {
            return null;
        }
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException exception) {
            log.warn("Ignoring unparsable {} value \'{}\' from api-ninjas", field, value);
            return null;
        }
    }

    private static Boolean bool(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asBoolean();
    }
}
