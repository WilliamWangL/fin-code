package com.fincode.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincode.api.application.service.DailyLookupQuotaService;
import com.fincode.api.application.service.RateLimitService;
import com.fincode.api.application.service.UsageService;
import jakarta.servlet.FilterChain;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/**
 * Anonymous branch of {@link RateLimitFilter}: the daily allowance is checked
 * after the per-minute bucket and reported through headers the website reads.
 */
class RateLimitFilterTest {

    private final RateLimitService rateLimitService = mock(RateLimitService.class);
    private final UsageService usageService = mock(UsageService.class);
    private final DailyLookupQuotaService dailyQuotaService = mock(DailyLookupQuotaService.class);
    private final ErrorResponseWriter errorResponseWriter = new ErrorResponseWriter(new ObjectMapper());
    private final RateLimitProperties properties = new RateLimitProperties();

    private final RateLimitFilter filter = new RateLimitFilter(rateLimitService, usageService,
            errorResponseWriter, dailyQuotaService, properties);

    @Test
    void anonymousLookupIsRejectedOnceTheDailyAllowanceIsSpent() throws Exception {
        MockHttpServletResponse response = perform("GET", "/v1/sort-code/20-00-00", "203.0.113.9",
                new DailyLookupQuotaService.Result(false, 5, 0, 43_000L));

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("43");
        assertThat(response.getHeader("X-Daily-Lookup-Remaining")).isEqualTo("0");
        assertThat(response.getContentAsString()).contains("DAILY_LIMIT_EXCEEDED");
    }

    @Test
    void anonymousLookupReportsTheRemainingDailyAllowance() throws Exception {
        AtomicBoolean reachedController = new AtomicBoolean(false);
        MockHttpServletResponse response = perform("GET", "/v1/bsb/062-001", "203.0.113.10",
                new DailyLookupQuotaService.Result(true, 5, 4, 0L), reachedController);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getHeader("X-Daily-Lookup-Limit")).isEqualTo("5");
        assertThat(response.getHeader("X-Daily-Lookup-Remaining")).isEqualTo("4");
        assertThat(reachedController).isTrue();
    }

    @Test
    void dailyAllowanceIsNotChargedOutsideThePublicLookups() throws Exception {
        when(rateLimitService.acquireAnonymous("203.0.113.11"))
                .thenReturn(new RateLimitService.Result(true, 9, 0));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/banks");
        request.setRemoteAddr("203.0.113.11");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean reachedController = new AtomicBoolean(false);
        filter.doFilter(request, response, invokedChain(reachedController));

        assertThat(reachedController).isTrue();
        assertThat(response.getHeader("X-Daily-Lookup-Remaining")).isNull();
        verify(dailyQuotaService, never()).acquire(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyInt());
    }

    private MockHttpServletResponse perform(String method, String uri, String clientIp,
                                            DailyLookupQuotaService.Result dailyResult) throws Exception {
        return perform(method, uri, clientIp, dailyResult, new AtomicBoolean(false));
    }

    private MockHttpServletResponse perform(String method, String uri, String clientIp,
                                            DailyLookupQuotaService.Result dailyResult,
                                            AtomicBoolean reachedController) throws Exception {
        when(rateLimitService.acquireAnonymous(clientIp)).thenReturn(new RateLimitService.Result(true, 9, 0));
        when(dailyQuotaService.acquire(clientIp, 5)).thenReturn(dailyResult);
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setRemoteAddr(clientIp);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, invokedChain(reachedController));
        return response;
    }

    private static FilterChain invokedChain(AtomicBoolean reachedController) {
        return (request, response) -> reachedController.set(true);
    }
}
