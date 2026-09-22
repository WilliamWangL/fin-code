import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { countries, institutions } from "@/lib/data";
import { identifierTypeLabel } from "@/lib/directory";
import { alternatesFor, siteConfig } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "countries" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/countries"),
  };
}

export default async function CountriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "countries" });
  const common = await getTranslations({ locale, namespace: "common" });

  const sorted = [...countries].sort((a, b) => a.nameEn.localeCompare(b.nameEn));

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

      <section aria-labelledby="country-directory" className="mt-10">
        <h2 id="country-directory" className="text-xl font-semibold tracking-tight">
          {common("resultsCount", { count: sorted.length })}
        </h2>
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{common("country")}</TableHead>
                <TableHead>ISO</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>{t("localIdentifier")}</TableHead>
                <TableHead>{t("currency")}</TableHead>
                <TableHead>{common("bank")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((country) => {
                const bankCount = institutions.filter(
                  (institution) => institution.country === country.iso2,
                ).length;
                return (
                  <TableRow key={country.iso2}>
                    <TableCell>
                      <Link
                        href={`/countries/${country.iso2}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {country.nameEn}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {country.nameLocal}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {country.iso2} / {country.iso3}
                    </TableCell>
                    <TableCell>
                      {country.iban.supported ? (
                        <Badge variant="success">
                          {t("ibanSupported")} · {country.iban.length}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t("noIban")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {country.localIdentifierType
                        ? identifierTypeLabel(common, country.localIdentifierType)
                        : "SWIFT/BIC"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{country.currency}</TableCell>
                    <TableCell className="text-sm">
                      {bankCount > 0 ? (
                        <Link
                          href={`/countries/${country.iso2}`}
                          className="text-primary hover:underline"
                        >
                          {bankCount}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
