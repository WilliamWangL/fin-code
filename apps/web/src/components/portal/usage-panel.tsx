"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchApiKeys,
  fetchUsageDaily,
  fetchUsageEndpoints,
  fetchUsageKeys,
  fetchUsageSummary,
} from "@/lib/portal/api";
import { portalErrorMessage } from "@/lib/portal/errors";
import type {
  ApiKeyData,
  ApiKeyUsageData,
  DailyUsageData,
  EndpointUsageData,
  UsageSummaryData,
} from "@/lib/portal/types";
import { cn } from "@/lib/utils";

/**
 * Usage reports (FIN-017): request counts, quota, error rate and latency per
 * endpoint, day and API key, over a selectable UTC date window (FIN-015).
 */

type Preset = "thisMonth" | "lastMonth" | "last7" | "last30" | "custom";

const PRESETS: { key: Preset; labelKey: string }[] = [
  { key: "thisMonth", labelKey: "rangeThisMonth" },
  { key: "lastMonth", labelKey: "rangeLastMonth" },
  { key: "last7", labelKey: "rangeLast7" },
  { key: "last30", labelKey: "rangeLast30" },
  { key: "custom", labelKey: "rangeCustom" },
];

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function previousMonthStart(date: string): string {
  const value = new Date(`${monthStart(date)}T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() - 1);
  return value.toISOString().slice(0, 10);
}

function monthEnd(start: string): string {
  const value = new Date(`${start}T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}

function rangeFor(preset: Preset, customFrom: string, customTo: string): { from?: string; to?: string } {
  const today = utcToday();
  switch (preset) {
    case "lastMonth": {
      const start = previousMonthStart(today);
      return { from: start, to: monthEnd(start) };
    }
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "custom":
      return { from: customFrom || undefined, to: customTo || undefined };
    default:
      // The API defaults to the current calendar month.
      return {};
  }
}

export function UsagePanel() {
  const t = useTranslations("portal");
  const locale = useLocale();
  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<UsageSummaryData | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointUsageData[]>([]);
  const [daily, setDaily] = useState<DailyUsageData[]>([]);
  const [keysUsage, setKeysUsage] = useState<ApiKeyUsageData[]>([]);
  const [keyNames, setKeyNames] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  const invalidRange =
    preset === "custom" && Boolean(customFrom) && Boolean(customTo) && customTo < customFrom;

  useEffect(() => {
    if (invalidRange) {
      return;
    }
    const { from, to } = rangeFor(preset, customFrom, customTo);
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchUsageSummary(from, to),
      fetchUsageEndpoints(from, to),
      fetchUsageDaily(from, to),
      fetchUsageKeys(from, to),
      fetchApiKeys().catch(() => [] as ApiKeyData[]),
    ])
      .then(([summaryData, endpointData, dailyData, keyData, keyList]) => {
        if (!active) {
          return;
        }
        setSummary(summaryData);
        setEndpoints(endpointData);
        setDaily(dailyData);
        setKeysUsage(keyData);
        setKeyNames(new Map(keyList.map((key) => [key.id, key.name])));
      })
      .catch((caught) => {
        if (active) {
          setError(caught);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [preset, customFrom, customTo, invalidRange, reload]);

  const numberFormat = new Intl.NumberFormat(locale);
  const formatNumber = (value: number) => numberFormat.format(value);
  const formatPercent = (rate: number) => `${(rate * 100).toFixed(1)}%`;
  const maxDaily = Math.max(...daily.map((day) => day.request_count), 1);
  const quota = summary?.quota ?? null;
  const quotaLimit = quota?.limit ?? null;
  const quotaProgress =
    quotaLimit && quotaLimit > 0 ? Math.min(((quota?.used ?? 0) / quotaLimit) * 100, 100) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("usageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("usageSubtitle")}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setPreset(option.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              preset === option.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground/80 hover:bg-muted",
            )}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label htmlFor="usage-from" className="text-sm font-medium">
              {t("from")}
            </label>
            <Input
              id="usage-from"
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="usage-to" className="text-sm font-medium">
              {t("to")}
            </label>
            <Input
              id="usage-to"
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            {t("apply")}
          </button>
        </div>
      )}

      {(invalidRange || error !== null) && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {invalidRange ? t("invalidRange") : portalErrorMessage(error, t)}
        </p>
      )}

      {loading && !invalidRange ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : (
        <>
          {summary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label={t("metricRequests")} value={formatNumber(summary.request_count)} />
              <MetricCard
                label={t("metricErrors")}
                value={formatNumber(summary.error_count)}
                hint={formatPercent(summary.error_rate)}
              />
              <MetricCard label={t("metricErrorRate")} value={formatPercent(summary.error_rate)} />
              <MetricCard
                label={t("metricAvgLatency")}
                value={`${formatNumber(summary.avg_latency_ms)} ${t("ms")}`}
                hint={`${t("metricMaxLatency")} ${formatNumber(summary.max_latency_ms)} ${t("ms")}`}
              />
            </div>
          )}

          {quota && (
            <Card>
              <CardHeader>
                <CardTitle>{t("quotaTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {quota.period} · {quota.plan}
                </p>
                <p className="text-lg font-semibold">
                  {quota.limit
                    ? `${formatNumber(quota.used)} / ${formatNumber(quota.limit)}`
                    : t("quotaUnlimited")}
                </p>
                {quotaProgress !== null && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${quotaProgress}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {endpoints.length === 0 && daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("usageEmpty")}</p>
          ) : (
            <>
              {endpoints.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold tracking-tight">{t("endpointsTitle")}</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("tableEndpoint")}</TableHead>
                        <TableHead>{t("tableRequests")}</TableHead>
                        <TableHead>{t("tableErrors")}</TableHead>
                        <TableHead>{t("tableErrorRate")}</TableHead>
                        <TableHead>{t("tableAvgLatency")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {endpoints.map((endpoint) => (
                        <TableRow key={endpoint.endpoint}>
                          <TableCell className="font-mono text-xs">{endpoint.endpoint}</TableCell>
                          <TableCell>{formatNumber(endpoint.request_count)}</TableCell>
                          <TableCell>{formatNumber(endpoint.error_count)}</TableCell>
                          <TableCell>{formatPercent(endpoint.error_rate)}</TableCell>
                          <TableCell>
                            {formatNumber(endpoint.avg_latency_ms)} {t("ms")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}

              {daily.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold tracking-tight">{t("dailyTitle")}</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("tableDay")}</TableHead>
                        <TableHead>{t("tableRequests")}</TableHead>
                        <TableHead className="w-48" aria-label={t("tableRequests")} />
                        <TableHead>{t("tableErrors")}</TableHead>
                        <TableHead>{t("tableAvgLatency")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {daily.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="whitespace-nowrap">{day.date}</TableCell>
                          <TableCell>{formatNumber(day.request_count)}</TableCell>
                          <TableCell>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${(day.request_count / maxDaily) * 100}%` }}
                              />
                            </div>
                          </TableCell>
                          <TableCell>{formatNumber(day.error_count)}</TableCell>
                          <TableCell>
                            {formatNumber(day.avg_latency_ms)} {t("ms")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}

              {keysUsage.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold tracking-tight">{t("keysUsageTitle")}</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("tableKey")}</TableHead>
                        <TableHead>{t("tableRequests")}</TableHead>
                        <TableHead>{t("tableErrors")}</TableHead>
                        <TableHead>{t("tableErrorRate")}</TableHead>
                        <TableHead>{t("tableAvgLatency")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keysUsage.map((entry) => (
                        <TableRow key={entry.api_key_id}>
                          <TableCell className="font-medium">
                            {keyNames.get(entry.api_key_id) ?? `#${entry.api_key_id}`}
                          </TableCell>
                          <TableCell>{formatNumber(entry.request_count)}</TableCell>
                          <TableCell>{formatNumber(entry.error_count)}</TableCell>
                          <TableCell>{formatPercent(entry.error_rate)}</TableCell>
                          <TableCell>
                            {formatNumber(entry.avg_latency_ms)} {t("ms")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
