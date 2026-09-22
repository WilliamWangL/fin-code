package com.fincode.api.application.service;

import com.fincode.api.domain.enums.Plan;
import com.fincode.api.domain.model.Organization;
import com.fincode.api.domain.repository.OrganizationRepository;
import com.fincode.api.domain.repository.RequestLogRepository;
import com.fincode.api.domain.repository.RequestLogRepository.ApiKeyUsageProjection;
import com.fincode.api.domain.repository.RequestLogRepository.DailyUsageProjection;
import com.fincode.api.domain.repository.RequestLogRepository.EndpointUsageProjection;
import com.fincode.api.domain.repository.RequestLogRepository.UsageSummaryProjection;
import com.fincode.api.dto.UsageDtos.ApiKeyUsageData;
import com.fincode.api.dto.UsageDtos.DailyUsageData;
import com.fincode.api.dto.UsageDtos.EndpointUsageData;
import com.fincode.api.dto.UsageDtos.QuotaData;
import com.fincode.api.dto.UsageDtos.UsageSummaryData;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Usage reporting for the developer portal (spec §44, FIN-015): request counts,
 * quota, endpoint usage, error rate and latency, scoped to one organization.
 * Windows are UTC dates and default to the current calendar month.
 */
@Service
@Transactional(readOnly = true)
public class UsageQueryService {

    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final long MAX_WINDOW_DAYS = 366;

    private final RequestLogRepository requestLogRepository;
    private final OrganizationRepository organizationRepository;

    public UsageQueryService(RequestLogRepository requestLogRepository,
                             OrganizationRepository organizationRepository) {
        this.requestLogRepository = requestLogRepository;
        this.organizationRepository = organizationRepository;
    }

    public UsageSummaryData summary(Long organizationId, LocalDate from, LocalDate to) {
        LocalDate[] window = resolveWindow(from, to);
        UsageSummaryProjection totals = requestLogRepository.summarize(
                organizationId, startOf(window[0]), endOf(window[1]));
        long requests = value(totals.getRequestCount());
        long errors = value(totals.getErrorCount());
        return new UsageSummaryData(
                window[0],
                window[1],
                requests,
                errors,
                errorRate(errors, requests),
                Math.round(doubleValue(totals.getAvgLatency())),
                (int) value(totals.getMaxLatency()),
                quota(organizationId));
    }

    public List<EndpointUsageData> byEndpoint(Long organizationId, LocalDate from, LocalDate to) {
        LocalDate[] window = resolveWindow(from, to);
        return requestLogRepository.summarizeByEndpoint(organizationId, startOf(window[0]), endOf(window[1])).stream()
                .map(this::toEndpointUsage)
                .toList();
    }

    public List<DailyUsageData> byDay(Long organizationId, LocalDate from, LocalDate to) {
        LocalDate[] window = resolveWindow(from, to);
        return requestLogRepository.summarizeByDay(organizationId, startOf(window[0]), endOf(window[1])).stream()
                .map(this::toDailyUsage)
                .toList();
    }

    public List<ApiKeyUsageData> byApiKey(Long organizationId, LocalDate from, LocalDate to) {
        LocalDate[] window = resolveWindow(from, to);
        return requestLogRepository.summarizeByApiKey(organizationId, startOf(window[0]), endOf(window[1])).stream()
                .map(this::toApiKeyUsage)
                .toList();
    }

    /**
     * Quota is reported against the organization plan for the current calendar
     * month. The used count comes from the request log (survives Redis resets);
     * over-quota attempts are still logged, so remaining is clamped at zero.
     */
    private QuotaData quota(Long organizationId) {
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        String period = now.format(MONTH_FORMAT);
        LocalDateTime monthStart = now.toLocalDate().withDayOfMonth(1).atStartOfDay();
        long used = requestLogRepository.countByOrganizationIdAndRequestDateGreaterThanEqual(organizationId, monthStart);
        Plan plan = organizationRepository.findById(organizationId).map(Organization::getPlan).orElse(Plan.FREE);
        if (plan.monthlyQuota() == Integer.MAX_VALUE) {
            return new QuotaData(period, plan.name(), null, used, null);
        }
        int limit = plan.monthlyQuota();
        return new QuotaData(period, plan.name(), limit, used, (int) Math.max(limit - used, 0));
    }

    private static LocalDate[] resolveWindow(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate start = from == null ? today.withDayOfMonth(1) : from;
        LocalDate end = to == null ? today : to;
        if (end.isBefore(start)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "The to date must not be before the from date");
        }
        if (ChronoUnit.DAYS.between(start, end) > MAX_WINDOW_DAYS) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "The reporting window cannot exceed 366 days");
        }
        return new LocalDate[] {start, end};
    }

    private static LocalDateTime startOf(LocalDate date) {
        return date.atStartOfDay();
    }

    /** Exclusive upper bound so the whole end day is included. */
    private static LocalDateTime endOf(LocalDate date) {
        return date.plusDays(1).atStartOfDay();
    }

    private EndpointUsageData toEndpointUsage(EndpointUsageProjection row) {
        long requests = value(row.getRequestCount());
        long errors = value(row.getErrorCount());
        return new EndpointUsageData(row.getEndpoint(), requests, errors, errorRate(errors, requests),
                Math.round(doubleValue(row.getAvgLatency())));
    }

    private DailyUsageData toDailyUsage(DailyUsageProjection row) {
        return new DailyUsageData(
                LocalDate.of(row.getYear(), row.getMonth(), row.getDay()),
                value(row.getRequestCount()),
                value(row.getErrorCount()),
                Math.round(doubleValue(row.getAvgLatency())));
    }

    private ApiKeyUsageData toApiKeyUsage(ApiKeyUsageProjection row) {
        long requests = value(row.getRequestCount());
        long errors = value(row.getErrorCount());
        return new ApiKeyUsageData(row.getApiKeyId(), requests, errors, errorRate(errors, requests),
                Math.round(doubleValue(row.getAvgLatency())));
    }

    private static long value(Long value) {
        return value == null ? 0L : value;
    }

    private static long value(Integer value) {
        return value == null ? 0L : value;
    }

    private static double doubleValue(Double value) {
        return value == null ? 0.0 : value;
    }

    /** 0..1 fraction rounded to 4 decimals (0.0123 = 1.23% of requests failed). */
    private static double errorRate(long errors, long requests) {
        if (requests == 0) {
            return 0.0;
        }
        return Math.round(errors * 10000.0 / requests) / 10000.0;
    }
}
