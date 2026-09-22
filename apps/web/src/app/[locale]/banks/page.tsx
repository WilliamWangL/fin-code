import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BankDirectory, type BankRow, type BankCountryOption } from "@/components/bank-directory";
import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { countryByIso2, formatIdentifier, hrefForIdentifier, institutions } from "@/lib/data";
import { alternatesFor, siteConfig } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "banks" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/banks"),
  };
}

export default async function BanksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "banks" });
  const common = await getTranslations({ locale, namespace: "common" });

  const rows: BankRow[] = institutions.map((institution) => {
    const country = countryByIso2[institution.country];
    const primary =
      institution.identifiers.find((item) => item.type === "SWIFT") ??
      institution.identifiers[0];
    return {
      slug: institution.slug,
      nameEn: institution.nameEn,
      shortName: institution.shortName,
      countryName: country?.nameEn ?? institution.country,
      countryIso2: institution.country,
      countryHref: `/countries/${institution.country}`,
      identifiersCount: institution.identifiers.length,
      branchesCount: institution.branches.length,
      primaryIdentifier: primary ? formatIdentifier(primary.type, primary.value) : "—",
      primaryIdentifierHref: primary ? hrefForIdentifier(primary.type, primary.value) : "/banks",
    };
  });

  const countries: BankCountryOption[] = Array.from(
    new Set(rows.map((row) => row.countryIso2)),
  )
    .map((iso2) => ({ iso2, name: countryByIso2[iso2]?.nameEn ?? iso2 }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title") },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        breadcrumbs={breadcrumbs}
      />

      <section aria-labelledby="bank-directory" className="mt-10">
        <h2 id="bank-directory" className="text-xl font-semibold tracking-tight">
          {t("resultCount", { count: rows.length })}
        </h2>
        <div className="mt-6">
          <BankDirectory rows={rows} countries={countries} />
        </div>
      </section>

      {/* ── Institutions by country ───────────────────────────────────── */}
      <section aria-labelledby="banks-by-country" className="mt-16">
        <h2 id="banks-by-country" className="text-xl font-semibold tracking-tight">
          {t("institutionsByCountry")}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {countries.map((option) => {
            const count = rows.filter((row) => row.countryIso2 === option.iso2).length;
            return (
              <li key={option.iso2}>
                <Link
                  href={`/countries/${option.iso2}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm transition-colors hover:border-primary/50"
                >
                  {option.name}
                  <span className="text-xs text-muted-foreground">
                    {t("resultCount", { count })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
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
          "@type": "WebPage",
          name: t("title"),
          description: t("metaDescription"),
          inLanguage: locale,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
        }}
      />
    </div>
  );
}
