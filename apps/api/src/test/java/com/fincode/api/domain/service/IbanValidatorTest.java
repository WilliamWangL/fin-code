package com.fincode.api.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * IBAN primitives: normalization, charset, country prefix, MOD-97 checksum,
 * national structure and BBAN segment extraction (spec §30, §31).
 */
class IbanValidatorTest {

    private static final String VALID_DE = "DE89370400440532013000";

    @Test
    void normalizeStripsWhitespaceAndDashesAndUppercases() {
        assertThat(IbanValidator.normalize("de89 3704-0044 0532 0130 00")).isEqualTo(VALID_DE);
        assertThat(IbanValidator.normalize(null)).isNull();
    }

    @Test
    void checksumAcceptsMod97ValidIbans() {
        assertThat(IbanValidator.checksumValid(VALID_DE)).isTrue();
        assertThat(IbanValidator.checksumValid("GB29NWBK60161331926819")).isTrue();
    }

    @Test
    void checksumRejectsCorruptedIbans() {
        assertThat(IbanValidator.checksumValid("DE89370400440532013001")).isFalse();
        assertThat(IbanValidator.checksumValid("DE99370400440532013000")).isFalse();
    }

    @Test
    void validatesCharsetAndCountryPrefix() {
        assertThat(IbanValidator.charsetValid(VALID_DE)).isTrue();
        assertThat(IbanValidator.charsetValid("DE89$370400440532013000")).isFalse();
        assertThat(IbanValidator.countryPrefixValid(VALID_DE)).isTrue();
        assertThat(IbanValidator.countryPrefixValid("D889370400440532013000")).isFalse();
        assertThat(IbanValidator.countryPrefixValid("X")).isFalse();
    }

    @Test
    void extractsCountryCodeAndCheckDigits() {
        assertThat(IbanValidator.countryCode(VALID_DE)).isEqualTo("DE");
        assertThat(IbanValidator.checkDigits(VALID_DE)).isEqualTo("89");
    }

    @Test
    void matchesGermanNationalStructure() {
        String template = "DEkk BBBB BBBB BBBB BBBB BB";
        assertThat(IbanValidator.structureMatches(template, VALID_DE)).isTrue();
        assertThat(IbanValidator.structureMatches(template, "DE89370400")).isFalse();
        assertThat(IbanValidator.structureMatches("DEkk BBBB BBBB BBBB BBBB Ba", VALID_DE)).isFalse();
    }

    @Nested
    class PositionParserTests {

        @Test
        void parsesStartLengthNotation() {
            assertThat(IbanPositionParser.parse("5-8")).containsExactly(5, 8);
            assertThat(IbanPositionParser.parse("13-10")).containsExactly(13, 10);
            assertThat(IbanPositionParser.parse(null)).isNull();
            assertThat(IbanPositionParser.parse(" ")).isNull();
            assertThat(IbanPositionParser.parse("abc")).isNull();
            assertThat(IbanPositionParser.parse("0-8")).isNull();
        }

        @Test
        void extractsOneBasedSegments() {
            assertThat(IbanPositionParser.extract(VALID_DE, "5-8")).isEqualTo("37040044");
            assertThat(IbanPositionParser.extract(VALID_DE, "13-10")).isEqualTo("0532013000");
            assertThat(IbanPositionParser.extract(VALID_DE, "18-10")).isNull();
        }
    }
}
