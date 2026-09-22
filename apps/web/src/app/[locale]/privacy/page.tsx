import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { alternatesFor, siteConfig } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("privacyTitle"),
    description: t("privacyMetaDescription"),
    alternates: alternatesFor(locale, "/privacy"),
  };
}

export default async function PrivacyPage({
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
    { label: t("privacyTitle") },
  ];

  const sections = [
    { title: t("privacyCollection"), body: t("privacyCollectionBody") },
    { title: t("privacyUsage"), body: t("privacyUsageBody") },
    { title: t("privacyContact"), body: t("privacyContactBody") },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("privacyTitle")}
        description={t("privacyIntro")}
        breadcrumbs={breadcrumbs}
      />

      <p className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        {t("preview")}
      </p>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title} aria-labelledby={`privacy-${section.title}`}>
            <h2
              id={`privacy-${section.title}`}
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

      <p className="mt-10 text-sm">
        <Link href="/contact" className="text-primary hover:underline">
          {common("breadcrumbHome")} · {t("privacyContact")}
        </Link>
      </p>

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
