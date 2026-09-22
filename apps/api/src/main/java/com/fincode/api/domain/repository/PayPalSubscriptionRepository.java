package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.PayPalSubscription;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayPalSubscriptionRepository extends JpaRepository<PayPalSubscription, Long> {

    Optional<PayPalSubscription> findBySubscriptionId(String subscriptionId);

    List<PayPalSubscription> findByOrganizationIdOrderByIdDesc(Long organizationId);

    List<PayPalSubscription> findByStatusIn(Collection<String> statuses);
}
