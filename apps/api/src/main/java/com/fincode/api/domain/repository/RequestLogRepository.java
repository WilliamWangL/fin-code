package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.RequestLog;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Request log persistence and reporting aggregates (spec §44, FIN-015).
 */
public interface RequestLogRepository extends JpaRepository<RequestLog, Long> {

    long countByApiKeyIdAndRequestDateGreaterThanEqual(Long apiKeyId, LocalDateTime from);

    long countByOrganizationIdAndRequestDateGreaterThanEqual(Long organizationId, LocalDateTime from);

    /** Window totals for one organization; {@code to} is exclusive. */
    @Query("""
            select count(r) as requestCount,
                   coalesce(sum(case when r.statusCode >= 400 then 1 else 0 end), 0) as errorCount,
                   coalesce(avg(r.responseTime), 0) as avgLatency,
                   coalesce(max(r.responseTime), 0) as maxLatency
            from RequestLog r
            where r.organizationId = :organizationId
              and r.requestDate >= :from
              and r.requestDate < :to
            """)
    UsageSummaryProjection summarize(@Param("organizationId") Long organizationId,
                                     @Param("from") LocalDateTime from,
                                     @Param("to") LocalDateTime to);

    /** Per-endpoint totals, busiest first. */
    @Query("""
            select r.endpoint as endpoint,
                   count(r) as requestCount,
                   coalesce(sum(case when r.statusCode >= 400 then 1 else 0 end), 0) as errorCount,
                   coalesce(avg(r.responseTime), 0) as avgLatency
            from RequestLog r
            where r.organizationId = :organizationId
              and r.requestDate >= :from
              and r.requestDate < :to
            group by r.endpoint
            order by count(r) desc, r.endpoint asc
            """)
    List<EndpointUsageProjection> summarizeByEndpoint(@Param("organizationId") Long organizationId,
                                                      @Param("from") LocalDateTime from,
                                                      @Param("to") LocalDateTime to);

    /** Per-day totals ordered chronologically. */
    @Query("""
            select extract(year from r.requestDate) as year,
                   extract(month from r.requestDate) as month,
                   extract(day from r.requestDate) as day,
                   count(r) as requestCount,
                   coalesce(sum(case when r.statusCode >= 400 then 1 else 0 end), 0) as errorCount,
                   coalesce(avg(r.responseTime), 0) as avgLatency
            from RequestLog r
            where r.organizationId = :organizationId
              and r.requestDate >= :from
              and r.requestDate < :to
            group by extract(year from r.requestDate),
                     extract(month from r.requestDate),
                     extract(day from r.requestDate)
            order by extract(year from r.requestDate),
                     extract(month from r.requestDate),
                     extract(day from r.requestDate)
            """)
    List<DailyUsageProjection> summarizeByDay(@Param("organizationId") Long organizationId,
                                              @Param("from") LocalDateTime from,
                                              @Param("to") LocalDateTime to);

    /** Per-API-key totals, busiest first. */
    @Query("""
            select r.apiKeyId as apiKeyId,
                   count(r) as requestCount,
                   coalesce(sum(case when r.statusCode >= 400 then 1 else 0 end), 0) as errorCount,
                   coalesce(avg(r.responseTime), 0) as avgLatency
            from RequestLog r
            where r.organizationId = :organizationId
              and r.requestDate >= :from
              and r.requestDate < :to
              and r.apiKeyId is not null
            group by r.apiKeyId
            order by count(r) desc, r.apiKeyId asc
            """)
    List<ApiKeyUsageProjection> summarizeByApiKey(@Param("organizationId") Long organizationId,
                                                  @Param("from") LocalDateTime from,
                                                  @Param("to") LocalDateTime to);

    interface UsageSummaryProjection {

        Long getRequestCount();

        Long getErrorCount();

        Double getAvgLatency();

        Integer getMaxLatency();
    }

    interface EndpointUsageProjection {

        String getEndpoint();

        Long getRequestCount();

        Long getErrorCount();

        Double getAvgLatency();
    }

    interface DailyUsageProjection {

        Integer getYear();

        Integer getMonth();

        Integer getDay();

        Long getRequestCount();

        Long getErrorCount();

        Double getAvgLatency();
    }

    interface ApiKeyUsageProjection {

        Long getApiKeyId();

        Long getRequestCount();

        Long getErrorCount();

        Double getAvgLatency();
    }
}
