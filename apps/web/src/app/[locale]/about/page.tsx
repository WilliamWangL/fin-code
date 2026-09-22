import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Database, Layers, ShieldCheck, GitBranch } from "lucide-react";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { datasetStats } from "@/lib/data";
import { dataSources } from "@/lib/data/sources";
import { alternatesFor, siteConfig } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/about"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });
  const common = await getTranslations({ locale, namespace: "common" });
  const stats = datasetStats();

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title") },
  ];

  const principles = [
    { icon: Database, body: t("principle1") },
    { icon: Layers, body: t("principle2") },
    { icon: ShieldCheck, body: t("principle3") },
    { icon: GitBranch, body: t("principle4") },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        breadcrumbs={breadcrumbs}
      />

      {/* ── Mission ───────────────────────────────────────────────────── */}
      <section aria-labelledby="mission" className="mt-10 max-w-3xl">
        <h2 id="mission" className="text-xl font-semibold tracking-tight">
          {t("missionTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("missionBody")}</p>
      </section>

      {/* ── Principles ────────────────────────────────────────────────── */}
      <section aria-labelledby="principles" className="mt-12">
        <h2 id="principles" className="text-xl font-semibold tracking-tight">
          {t("principlesTitle")}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {principles.map((principle) => (
            <li
              key={principle.body}
              className="flex gap-3 rounded-xl border border-border bg-card p-5"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <principle.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <p className="text-sm leading-relaxed">{principle.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Data sources ──────────────────────────────────────────────── */}
      <section aria-labelledby="sources" className="mt-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 id="sources" className="text-xl font-semibold tracking-tight">
              {t("sourcesTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("sourcesBody")}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("identifier")}
                </dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight">{stats.identifiers}</dd>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("bank")}
                </dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight">{stats.institutions}</dd>
              </div>
            </dl>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{common("dataSource")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{common("dataSource")}</TableHead>
                    <TableHead>{common("type")}</TableHead>
                    <TableHead>{common("retrievedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataSources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="text-sm font-medium">{source.name}</TableCell>
                      <TableCell className="text-sm">{source.sourceType}</TableCell>
                      <TableCell className="font-mono text-sm">{source.retrievedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: t("title"),
          description: t("metaDescription"),
          inLanguage: locale,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
        }}
      />
    </div>
  );
}
