package com.fincode.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Boots the full application context against MySQL: verifies Flyway migration,
 * Hibernate entity-to-schema validation (ddl-auto=validate) and the FIN-002 tables.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class FincodeApiApplicationTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads() {
        // Context startup itself asserts: Flyway applied + Hibernate validate passed
    }

    @Test
    void flywayAppliedAllFin002Tables() {
        List<String> tables = jdbcTemplate.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()",
                String.class);

        assertThat(tables).contains(
                "country",
                "currency",
                "financial_institution",
                "bank_branch",
                "bank_identifier",
                "iban_country_format",
                "data_source",
                "data_version",
                "data_change",
                "api_key",
                "request_log",
                "user_account",
                "organization",
                "organization_member",
                "refresh_token",
                "password_reset_token",
                "paypal_subscription",
                "paypal_webhook_event",
                "bank_swift_code_directory",
                "bank_routing_directory");

        List<String> appliedMigrations = jdbcTemplate.queryForList(
                "SELECT version FROM flyway_schema_history WHERE success = TRUE ORDER BY installed_rank",
                String.class);
        assertThat(appliedMigrations).containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11");
    }
}
