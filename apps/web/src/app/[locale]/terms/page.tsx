import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { alternatesFor, siteConfig } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("termsTitle"),
    description: t("termsMetaDescription"),
    alternates: alternatesFor(locale, "/terms"),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });
  const common = await getTranslations({ locale, namespace: "common" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("termsTitle") },
  ];

  const sections = [
    { title: t("termsData"), body: t("termsDataBody") },
    { title: t("termsAccounts"), body: t("termsAccountsBody") },
    { title: t("termsChanges"), body: t("termsChangesBody") },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("termsTitle")}
        description={t("termsIntro")}
        breadcrumbs={breadcrumbs}
      />

      <p className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        {t("preview")}
      </p>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title} aria-labelledby={`terms-${section.title}`}>
            <h2
              id={`terms-${section.title}`}
              className="text-lg font-semibold tracking-tight"
            >
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
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
