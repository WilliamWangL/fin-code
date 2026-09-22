import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { dataSources } from "@/lib/data/sources";
import { alternatesFor, siteConfig } from "@/lib/site";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "status" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/status"),
  };
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "status" });
  const common = await getTranslations({ locale, namespace: "common" });

  // Snapshot date: the most recent dataset retrieval across all sources.
  const lastChecked = dataSources
    .map((source) => source.retrievedAt)
    .sort()
    .at(-1);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title") },
  ];

  const components = [
    "api",
    "website",
    "search",
    "iban",
    "swift",
    "routing",
    "bankDirectory",
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        breadcrumbs={breadcrumbs}
        badge={
          <Badge variant="success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {t("allOperational")}
          </Badge>
        }
      />

      <Card className="mt-10">
        <CardContent className="divide-y divide-border">
          {components.map((key) => (
            <div key={key} className="flex items-center justify-between gap-4 py-4">
              <p className="text-sm font-medium">{t(`components.${key}`)}</p>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                {t("operational")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 space-y-1 text-xs text-muted-foreground">
        {lastChecked && (
          <p>
            {t("lastChecked")}: <span className="font-mono">{lastChecked}</span>
          </p>
        )}
        <p>{t("note")}</p>
      </div>

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
