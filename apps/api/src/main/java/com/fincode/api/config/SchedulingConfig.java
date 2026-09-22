package com.fincode.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables scheduled tasks. The subscription reconciliation job (FIN-019) uses
 * this to recover from missed PayPal webhooks; jobs no-op when billing is not
 * configured.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
