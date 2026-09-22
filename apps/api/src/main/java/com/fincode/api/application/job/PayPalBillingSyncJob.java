package com.fincode.api.application.job;

import com.fincode.api.application.service.BillingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Safety net for missed PayPal webhooks (FIN-019): reconciles local
 * subscription state with the provider on a fixed cadence. No-ops when PayPal
 * is not configured or no subscription is stale.
 */
@Component
public class PayPalBillingSyncJob {

    private static final Logger log = LoggerFactory.getLogger(PayPalBillingSyncJob.class);

    private final BillingService billingService;

    public PayPalBillingSyncJob(BillingService billingService) {
        this.billingService = billingService;
    }

    @Scheduled(initialDelayString = "${fincode.paypal.sync-initial-delay:PT2M}",
            fixedDelayString = "${fincode.paypal.sync-interval:PT30M}")
    public void reconcileSubscriptions() {
        try {
            int synced = billingService.reconcileStaleSubscriptions();
            if (synced > 0) {
                log.info("Reconciled {} PayPal subscription(s) with the provider", synced);
            }
        } catch (RuntimeException exception) {
            // A failed reconciliation must never kill the scheduler thread.
            log.warn("PayPal subscription reconciliation failed: {}", exception.getMessage());
        }
    }
}
