"use client";

import { BookOpen, KeyRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/portal/copy-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { fetchMe, fetchUsageSummary } from "@/lib/portal/api";
import { portalErrorMessage } from "@/lib/portal/errors";
import type { MeData, UsageSummaryData } from "@/lib/portal/types";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Dashboard overview (FIN-017): organization + plan, the current month quota
 * and usage, and a quickstart snippet for the first API call.
 */
export function DashboardOverview() {
  const t = useTranslations("portal");
  const locale = useLocale();
  const [me, setMe] = useState<MeData | null>(null);
  const [summary, setSummary] = useState<UsageSummaryData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchMe(), fetchUsageSummary()])
      .then(([meData, summaryData]) => {
        if (active) {
          setMe(meData);
          setSummary(summaryData);
        }
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
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {portalErrorMessage(error, t)}
      </p>
    );
  }

  const organization = me?.organizations[0] ?? null;
  const quota = summary?.quota ?? null;
  const numberFormat = new Intl.NumberFormat(locale);
  const percent = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  const limit = quota?.limit ?? null;
  const used = quota?.used ?? 0;
  const progress = limit && limit > 0 ? Math.min((used / limit) * 100, 100) : null;

  const snippet = [
    `curl "${siteConfig.apiBaseUrl}/iban/validate?iban=DE89370400440532013000" \\`,
    `  -H "Authorization: Bearer sk_test_your_key"`,
  ].join("\n");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboardTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboardSubtitle")}</p>
        {organization && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-sm font-medium">{organization.name}</span>
            <Badge variant="outline">{organization.plan}</Badge>
            {organization.role && <Badge variant="secondary">{organization.role}</Badge>}
          </div>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("quotaTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold">
              {limit
                ? `${numberFormat.format(used)} / ${numberFormat.format(limit)}`
                : numberFormat.format(used)}
            </p>
            {progress !== null && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {limit
                ? t("quotaRemaining").replace("{remaining}", numberFormat.format(quota?.remaining ?? 0))
                : t("quotaUnlimited")}
              {quota?.period ? ` · ${t("quotaPeriod")} ${quota.period}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("usageThisMonth")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("metricRequests")}</p>
              <p className="text-xl font-semibold">{numberFormat.format(summary?.request_count ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("metricErrors")}</p>
              <p className="text-xl font-semibold">{numberFormat.format(summary?.error_count ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("metricErrorRate")}</p>
              <p className="text-xl font-semibold">{percent(summary?.error_rate ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("metricAvgLatency")}</p>
              <p className="text-xl font-semibold">
                {numberFormat.format(summary?.avg_latency_ms ?? 0)} {t("ms")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("quickstartTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>{t("quickstartStep1")}</li>
            <li>{t("quickstartStep2")}</li>
            <li>{t("quickstartStep3")}</li>
          </ol>
          <div className="relative rounded-lg border border-border bg-muted/40 p-4">
            <pre className="overflow-x-auto text-xs leading-6">
              <code>{snippet}</code>
            </pre>
            <div className="mt-3">
              <CopyButton value={snippet} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/api-keys" className={cn(buttonVariants())}>
              <KeyRound className="h-4 w-4" aria-hidden />
              {t("createKeyCta")}
            </Link>
            <Link href="/docs/quickstart" className={cn(buttonVariants({ variant: "outline" }))}>
              <BookOpen className="h-4 w-4" aria-hidden />
              {t("readDocsCta")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
