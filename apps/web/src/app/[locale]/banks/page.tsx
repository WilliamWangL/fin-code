import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BankDirectory, type BankRow, type BankCountryOption } from "@/components/bank-directory";
import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { countryByIso2, formatIdentifier, hrefForIdentifier, institutions } from "@/lib/data";
import { branchCountOf, type Institution } from "@/lib/data/types";
import { alternatesFor, siteConfig } from "@/lib/site";
import { breadcrumbListJsonLd } from "@/lib/structured-data";

/** Homepage spotlights the three biggest banks of each country; the full
 * directory (every indexed institution) stays searchable via the site search
 * and the per-country pages. */
const TOP_BANKS_PER_COUNTRY = 3;

function toRow(institution: Institution): BankRow {
  const country = countryByIso2[institution.country];
  const primary =
    institution.identifiers.find((item) => item.type === "SWIFT") ??
    institution.identifiers[0];
  return {
    slug: institution.slug,
    nameEn: institution.nameEn,
    shortName: institution.shortName,
    legalName: institution.legalName,
    nameLocal: institution.nameLocal,
    countryName: country?.nameEn ?? institution.country,
    countryIso2: institution.country,
    countryHref: `/countries/${institution.country}`,
    identifiersCount: institution.identifiers.length,
    branchesCount: branchCountOf(institution),
    primaryIdentifier: primary
      ? formatIdentifier(primary.type, primary.value)
      : undefined,
    primaryIdentifierHref: primary
      ? hrefForIdentifier(primary.type, primary.value)
      : undefined,
  };
}

function topBanksByCountry(): { top: Institution[]; counts: Map<string, number> } {
  const grouped = new Map<string, Institution[]>();
  const counts = new Map<string, number>();
  for (const institution of institutions) {
    counts.set(institution.country, (counts.get(institution.country) ?? 0) + 1);
    const list = grouped.get(institution.country);
    if (list) {
      list.push(institution);
    } else {
      grouped.set(institution.country, [institution]);
    }
  }
  const top: Institution[] = [];
  for (const list of grouped.values()) {
    // Stable sort: ties keep the directory (index) order.
    top.push(...[...list].sort((a, b) => branchCountOf(b) - branchCountOf(a)).slice(0, TOP_BANKS_PER_COUNTRY));
  }
  return { top, counts };
}

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

  const { top, counts: countryCounts } = topBanksByCountry();
  // Searches and country chips run over every indexed institution (long tail
  // included); the table itself only spotlights the top banks.
  const searchPool = institutions.map(toRow);

  const rows: BankRow[] = top.map(toRow);

  const countries: BankCountryOption[] = Array.from(countryCounts.keys())
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
          {t("topByCountry")}
        </h2>
        <div className="mt-6">
          <BankDirectory
            rows={rows}
            countries={countries}
            countryCounts={countryCounts}
            searchPool={searchPool}
          />
        </div>
      </section>

      {/* ── Institutions by country ───────────────────────────────────── */}
      <section aria-labelledby="banks-by-country" className="mt-16">
        <h2 id="banks-by-country" className="text-xl font-semibold tracking-tight">
          {t("institutionsByCountry")}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {countries.map((option) => {
            const count = countryCounts.get(option.iso2) ?? 0;
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

      <JsonLd data={breadcrumbListJsonLd(breadcrumbs, locale)} />
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
