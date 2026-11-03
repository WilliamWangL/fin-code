import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { guideBody, guides } from "@/lib/guides";
import { alternatesFor, siteConfig } from "@/lib/site";
import { breadcrumbListJsonLd } from "@/lib/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/guides"),
  };
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "guides" });
  const common = await getTranslations({ locale, namespace: "common" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title") },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader title={t("title")} description={t("subtitle")} breadcrumbs={breadcrumbs} />

      <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {t("indexIntro")}
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {guides.map((guide) => {
          const body = guideBody(guide, locale);
          return (
            <li key={guide.slug}>
              <Link
                href={`/guides/${guide.slug}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                {guide.featured && <Badge variant="success">{t("startHere")}</Badge>}
                <span className="text-base font-semibold tracking-tight">{body.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {body.description}
                </span>
                <span className="mt-auto text-sm font-medium text-primary">
                  {t("readGuide")} →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <JsonLd data={breadcrumbListJsonLd(breadcrumbs, locale)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: t("title"),
          description: t("metaDescription"),
          inLanguage: locale,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
          hasPart: guides.map((guide) => {
            const body = guideBody(guide, locale);
            return {
              "@type": "TechArticle",
              headline: body.title,
              url: `${siteConfig.url}/${locale}/guides/${guide.slug}`,
            };
          }),
        }}
      />
    </div>
  );
}
