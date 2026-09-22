package com.fincode.api.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fincode.api.domain.enums.IdentifierType;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Format validation and detection for the non-IBAN identifier types
 * (spec §29, §32).
 */
class IdentifierValidatorsTest {

    @Nested
    class RoutingValidatorTests {

        @Test
        void normalizesAndAcceptsValidChecksum() {
            assertThat(RoutingValidator.normalize("0210-00021")).isEqualTo("021000021");
            assertThat(RoutingValidator.isFormValid("021000021")).isTrue();
            assertThat(RoutingValidator.checksumValid("021000021")).isTrue();
        }

        @Test
        void rejectsWrongLengthOrChecksum() {
            assertThat(RoutingValidator.isFormValid("12345678")).isFalse();
            assertThat(RoutingValidator.isFormValid("1234567890")).isFalse();
            assertThat(RoutingValidator.checksumValid("123456789")).isFalse();
        }
    }

    @Nested
    class SwiftValidatorTests {

        @Test
        void acceptsEightAndElevenCharacterCodes() {
            assertThat(SwiftValidator.isValid("ICBKCNBJ")).isTrue();
            assertThat(SwiftValidator.isValid("DEUTDEFF500")).isTrue();
        }

        @Test
        void rejectsMalformedCodes() {
            assertThat(SwiftValidator.isValid("ICBKCNB")).isFalse();
            assertThat(SwiftValidator.isValid("ICBKCNBJXX")).isFalse();
            assertThat(SwiftValidator.isValid("1CBKCNBJ")).isFalse();
            assertThat(SwiftValidator.isValid(null)).isFalse();
        }

        @Test
        void normalizesInputAndParsesParts() {
            assertThat(SwiftValidator.normalize("deut deff")).isEqualTo("DEUTDEFF");
            SwiftValidator.Parts parts = SwiftValidator.parse("DEUTDEFF500");
            assertThat(parts).isNotNull();
            assertThat(parts.institutionCode()).isEqualTo("DEUT");
            assertThat(parts.countryCode()).isEqualTo("DE");
            assertThat(parts.locationCode()).isEqualTo("FF");
            assertThat(parts.branchCode()).isEqualTo("500");
            assertThat(SwiftValidator.parse("DEUTDEFF").branchCode()).isNull();
            assertThat(SwiftValidator.parse("BAD")).isNull();
        }
    }

    @Nested
    class FormatValidatorTests {

        @Test
        void validatesTypeSpecificFormats() {
            assertThat(IdentifierFormatValidator.isValid(IdentifierType.SORT_CODE, "200000")).isTrue();
            assertThat(IdentifierFormatValidator.isValid(IdentifierType.SORT_CODE, "20000")).isFalse();
            assertThat(IdentifierFormatValidator.isValid(IdentifierType.BSB, "062001")).isTrue();
            assertThat(IdentifierFormatValidator.isValid(IdentifierType.IFSC, "SBIN0001234")).isTrue();
            assertThat(IdentifierFormatValidator.isValid(IdentifierType.IFSC, "SBIN1001234")).isFalse();
            assertThat(IdentifierFormatValidator.isValid(IdentifierType.CNAPS, "102100099996")).isTrue();
            assertThat(IdentifierFormatValidator.isValid(IdentifierType.CNAPS, "10210009999")).isFalse();
            assertThat(IdentifierFormatValidator.isValid(IdentifierType.ABA_ROUTING, "021000021")).isTrue();
        }

        @Test
        void formatsDisplayValues() {
            assertThat(IdentifierFormatValidator.format(IdentifierType.SORT_CODE, "200000")).isEqualTo("20-00-00");
            assertThat(IdentifierFormatValidator.format(IdentifierType.BSB, "062001")).isEqualTo("062-001");
            assertThat(IdentifierFormatValidator.format(IdentifierType.SWIFT, "ICBKCNBJ")).isEqualTo("ICBKCNBJ");
        }
    }

    @Nested
    class DetectorTests {

        @Test
        void detectsTypedCandidatesInPriorityOrder() {
            assertThat(IdentifierDetector.detect("ICBKCNBJ")).containsExactly(IdentifierType.SWIFT);
            assertThat(IdentifierDetector.detect("SBIN0001234")).containsExactly(IdentifierType.IFSC);
            assertThat(IdentifierDetector.detect("021000021")).containsExactly(IdentifierType.ABA_ROUTING);
            assertThat(IdentifierDetector.detect("102100099996")).containsExactly(IdentifierType.CNAPS);
            assertThat(IdentifierDetector.detect("200000"))
                    .containsExactly(IdentifierType.SORT_CODE, IdentifierType.BSB);
            assertThat(IdentifierDetector.detect("HELLO")).isEmpty();
        }

        @Test
        void detectsIbanShape() {
            assertThat(IdentifierDetector.looksLikeIban("DE89370400440532013000")).isTrue();
            assertThat(IdentifierDetector.looksLikeIban("ICBKCNBJ")).isFalse();
            assertThat(IdentifierDetector.looksLikeIban("DE89")).isFalse();
        }
    }
}
