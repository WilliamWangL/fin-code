import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { IdentifierDirectory } from "@/components/identifier-directory";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { buildDirectoryRows, type IdentifierTypeConfig } from "@/lib/directory";
import { alternatesFor, siteConfig } from "@/lib/site";

export interface IdentifierDirectoryPageProps {
  locale: string;
  config: IdentifierTypeConfig;
}

/**
 * Shared renderer for identifier directory pages
 * (/swift-codes, /routing-numbers, /sort-codes, /bsb, /ifsc, /cnaps).
 *
 * Template: H1 + intro, "what is" explainer, optional format spec,
 * filterable directory table, FAQ, structured data.
 */
export async function IdentifierDirectoryPage({
  locale,
  config,
}: IdentifierDirectoryPageProps) {
  const { rows, countries } = buildDirectoryRows(config.type);
  const t = await getTranslations({
    locale,
    namespace: `tool.${config.messageNamespace}`,
  });
  const common = await getTranslations({ locale, namespace: "common" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title") },
  ];

  const faqItems = [
    { question: t("detailFaq1Q"), answer: t("detailFaq1A") },
    { question: t("detailFaq2Q"), answer: t("detailFaq2A") },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        breadcrumbs={breadcrumbs}
      />

      {/* ── What is this identifier ───────────────────────────────────── */}
      <section aria-labelledby="what-is" className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 id="what-is" className="text-xl font-semibold tracking-tight">
            {t("whatTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("whatBody")}
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("count", { count: rows.length })}
            </dt>
            <dd className="mt-1 text-sm">{common("verified")}: {rows.filter((row) => row.verified).length}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {common("country")}
            </dt>
            <dd className="mt-1 text-sm">{countries.length}</dd>
          </div>
        </dl>
      </section>

      {/* ── Format specification (when defined) ───────────────────────── */}
      {t.has("formatTitle") && (
        <section aria-labelledby="format-spec" className="mt-10">
          <h2 id="format-spec" className="text-xl font-semibold tracking-tight">
            {t("formatTitle")}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t("formatBody")}
          </p>
        </section>
      )}

      {/* ── Directory ─────────────────────────────────────────────────── */}
      <section aria-labelledby="directory" className="mt-10">
        <h2 id="directory" className="text-xl font-semibold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("count", { count: rows.length })}
        </p>
        <div className="mt-6">
          <IdentifierDirectory
            rows={rows}
            countries={countries}
            apiLookup={
              config.type === "SWIFT" ? "swift" : config.type === "ABA_ROUTING" ? "routing" : undefined
            }
          />
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="directory-faq" className="mt-16">
        <h2 id="directory-faq" className="text-xl font-semibold tracking-tight">
          {t("faqTitle")}
        </h2>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {faqItems.map((item) => (
            <details key={item.question} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium">
                {item.question}
                <span className="text-muted-foreground transition-transform group-open:rotate-90" aria-hidden>
                  ›
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />
    </div>
  );
}

/** Shared metadata generator for identifier directory pages. */
export async function identifierDirectoryMetadata(
  locale: string,
  config: IdentifierTypeConfig,
): Promise<Metadata> {
  const t = await getTranslations({
    locale,
    namespace: `tool.${config.messageNamespace}`,
  });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, config.basePath),
  };
}
