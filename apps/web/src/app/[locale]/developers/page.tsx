import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight, Code2, Globe, KeyRound, RefreshCcw, Terminal } from "lucide-react";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { datasetStats } from "@/lib/data";
import { docGroups } from "@/lib/docs";
import { alternatesFor, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "developers" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/developers"),
  };
}

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "developers" });
  const common = await getTranslations({ locale, namespace: "common" });
  const docs = await getTranslations({ locale, namespace: "docs" });
  const stats = datasetStats();

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title") },
  ];

  const quickstartCode = `curl -s "${siteConfig.apiBaseUrl}/iban/validate?iban=DE89370400440532013000" \\
  -H "Authorization: Bearer sk_test_xxx"`;

  const responseCode = `{
  "data": {
    "valid": true,
    "iban": "DE89370400440532013000",
    "country": "DE",
    "bank_code": "37040044",
    "account_number": "0532013000"
  },
  "meta": { "request_id": "req_1a2b3c4d" }
}`;

  const features = [
    { icon: Globe, body: t("feature1") },
    { icon: Code2, body: t("feature2") },
    { icon: RefreshCcw, body: t("feature3") },
    { icon: KeyRound, body: t("feature4") },
  ];

  const groupLabels: Record<string, string> = {
    "getting-started": docs("groupGettingStarted"),
    endpoints: docs("groupEndpoints"),
    reference: docs("groupReference"),
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        breadcrumbs={breadcrumbs}
      />

      {/* ── Quickstart ────────────────────────────────────────────────── */}
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("quickstartTitle")}</h2>
          <p className="mt-3 max-w-lg text-muted-foreground">{t("quickstartBody")}</p>
          <ul className="mt-6 space-y-3">
            {[
              common("resultsCount", { count: stats.identifiers }),
              common("resultsCount", { count: stats.institutions }),
              common("resultsCount", { count: stats.ibanCountries }),
            ].map((stat, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                {stat}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={cn(buttonVariants())}>
              {common("getApiKey")}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/docs/quickstart" className={cn(buttonVariants({ variant: "outline" }))}>
              {t("readDocs")}
            </Link>
            <Link href="/docs/api-reference" className={cn(buttonVariants({ variant: "outline" }))}>
              {t("viewApiReference")}
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Terminal className="h-4 w-4" aria-hidden />
              {t("quickstartTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="overflow-hidden rounded-xl border border-border bg-muted/50">
              <div className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {common("apiEndpoint")}
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
                <code>{quickstartCode}</code>
              </pre>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-muted/50">
              <div className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                200 OK
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
                <code>{responseCode}</code>
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section aria-labelledby="dev-features" className="mt-16">
        <h2 id="dev-features" className="text-xl font-semibold tracking-tight">
          {t("featuresTitle")}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature.body}
              className="flex gap-3 rounded-xl border border-border bg-card p-5"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <p className="text-sm leading-relaxed">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Documentation ─────────────────────────────────────────────── */}
      <section aria-labelledby="dev-docs" className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="dev-docs" className="text-xl font-semibold tracking-tight">
              {t("docsTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("docsSubtitle")}</p>
          </div>
          <Link href="/docs" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            {t("readDocs")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-6 space-y-8">
          {docGroups.map((group) => (
            <div key={group.key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {groupLabels[group.key] ?? group.key}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.pages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/docs/${page.slug}`}
                      className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-sm transition-colors hover:border-primary/50"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.label,
            ...(crumb.href
              ? { item: `${siteConfig.url}/${locale}${crumb.href === "/" ? "" : crumb.href}` }
              : {}),
          })),
        }}
      />
    </div>
  );
}
