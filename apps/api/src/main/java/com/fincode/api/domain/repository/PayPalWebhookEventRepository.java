package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.PayPalWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayPalWebhookEventRepository extends JpaRepository<PayPalWebhookEvent, Long> {

    boolean existsByEventId(String eventId);
}
