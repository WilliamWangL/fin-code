import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { identifierTypeLabel } from "@/lib/directory";
import {
  countryByIso2,
  countries,
  formatIdentifier,
  hrefForIdentifier,
  ibanFormatByCountry,
  institutions,
} from "@/lib/data";
import type { Segment } from "@/lib/data/types";
import { alternatesFor, siteConfig } from "@/lib/site";

export const revalidate = 86400;

export function generateStaticParams() {
  return countries.map((country) => ({ country: country.iso2 }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}): Promise<Metadata> {
  const { locale, country: iso2 } = await params;
  const country = countryByIso2[iso2.toUpperCase()];
  if (!country) return {};
  const t = await getTranslations({ locale, namespace: "ibanCountry" });
  const format = ibanFormatByCountry[country.iso2];
  return {
    title: format
      ? t("metaTitle", { country: country.nameEn })
      : t("ibanNotSupported", { country: country.nameEn }),
    description: format
      ? t("metaDescription", { country: country.nameEn })
      : t("ibanNotSupportedBody", { country: country.nameEn }),
    alternates: alternatesFor(locale, `/iban/${country.iso2}`),
  };
}

export default async function IbanCountryPage({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}) {
  const { locale, country: iso2 } = await params;
  setRequestLocale(locale);
  const country = countryByIso2[iso2.toUpperCase()];
  if (!country) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "ibanCountry" });
  const common = await getTranslations({ locale, namespace: "common" });
  const tool = await getTranslations({ locale, namespace: "tool" });
  const format = ibanFormatByCountry[country.iso2];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: tool("ibanCheckerTitle"), href: "/iban-checker" },
    { label: country.nameEn, href: `/countries/${country.iso2}` },
  ];

  const segmentRows: { label: string; segment: Segment }[] = format
    ? [
        format.bankCode && { label: common("bankCode"), segment: format.bankCode },
        format.branchCode && { label: common("branchCode"), segment: format.branchCode },
        format.accountNumber && {
          label: common("accountNumber"),
          segment: format.accountNumber,
        },
        format.nationalCheck && {
          label: common("nationalCheck"),
          segment: format.nationalCheck,
        },
      ].filter((row): row is { label: string; segment: Segment } => row !== undefined)
    : [];

  const localBanks = institutions.filter(
    (institution) => institution.country === country.iso2,
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title", { country: country.nameEn })}
        description={format ? t("subtitle") : t("ibanNotSupportedBody", { country: country.nameEn })}
        breadcrumbs={breadcrumbs}
        badge={
          format ? (
            <Badge variant="success">{t("ibanSupported")}</Badge>
          ) : (
            <Badge variant="outline">{t("ibanNotSupported", { country: country.nameEn })}</Badge>
          )
        }
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* ── IBAN format ─────────────────────────────────────────────── */}
        {format ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("formatTitle")}</CardTitle>
              <CardDescription>
                {common("length")}: {format.length} · ISO 13616
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {common("length")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{format.length}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {common("structure")}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-medium">{format.structure}</dd>
                </div>
                {format.example && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {common("example")}
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-medium break-all">
                      {formatIdentifier("IBAN", format.example)}
                    </dd>
                  </div>
                )}
              </dl>

              {segmentRows.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">{t("segmentsTitle")}</h3>
                  <div className="mt-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{common("identifier")}</TableHead>
                          <TableHead>{common("length")}</TableHead>
                          <TableHead>1 – {format.length}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {segmentRows.map((row) => (
                          <TableRow key={row.label}>
                            <TableCell className="text-sm font-medium">{row.label}</TableCell>
                            <TableCell className="text-sm">{row.segment.length}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {row.segment.start}–{row.segment.start + row.segment.length - 1}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {format.example && (
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t("validateTitle", { country: country.nameEn })}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t("validateBody")}</p>
                  </div>
                  <Link
                    href={`/iban-checker?iban=${format.example}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    {t("openChecker")}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("ibanNotSupported", { country: country.nameEn })}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("ibanNotSupportedBody", { country: country.nameEn })}
              </p>
              {country.localIdentifierType && (
                <p className="mt-4 text-sm">
                  <Link
                    href={countryIdentifierHref(country.iso2, country.localIdentifierType)}
                    className="text-primary hover:underline"
                  >
                    {common("localIdentifier")}: {identifierTypeLabel(common, country.localIdentifierType)}
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Country summary ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{country.nameEn}</CardTitle>
            <CardDescription>{country.nameLocal}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">ISO</dt>
                <dd className="mt-0.5 font-medium">
                  {country.iso2} / {country.iso3} / {country.numeric}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("country")}
                </dt>
                <dd className="mt-0.5">
                  <Link href={`/countries/${country.iso2}`} className="font-medium text-primary hover:underline">
                    {country.nameEn}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("type")}
                </dt>
                <dd className="mt-0.5 font-medium">
                  {format ? `${t("ibanSupported")} · ${format.length}` : t("ibanNotSupported", { country: country.nameEn })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* ── Banks in country ──────────────────────────────────────────── */}
      {localBanks.length > 0 && (
        <section aria-labelledby="iban-country-banks" className="mt-10">
          <h2 id="iban-country-banks" className="text-xl font-semibold tracking-tight">
            {t("banksTitle", { country: country.nameEn })}
          </h2>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{common("bank")}</TableHead>
                  <TableHead>{common("identifier")}</TableHead>
                  <TableHead>{common("city")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localBanks.map((institution) => {
                  const swift =
                    institution.identifiers.find((item) => item.type === "SWIFT") ??
                    institution.identifiers[0];
                  return (
                    <TableRow key={institution.slug}>
                      <TableCell>
                        <Link href={`/banks/${institution.slug}`} className="text-sm font-medium hover:underline">
                          {institution.nameEn}
                        </Link>
                      </TableCell>
                      {swift ? (
                        <TableCell className="font-mono text-sm">
                          <Link
                            href={hrefForIdentifier(swift.type, swift.value)}
                            className="text-primary hover:underline"
                          >
                            {formatIdentifier(swift.type, swift.value)}
                          </Link>
                        </TableCell>
                      ) : (
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      )}
                      <TableCell className="text-sm">
                        {swift?.city ?? institution.branches[0]?.city ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

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
          name: t("title", { country: country.nameEn }),
          inLanguage: locale,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
        }}
      />
    </div>
  );
}

/** Directory base path for a country's local identifier system. */
function countryIdentifierHref(iso2: string, type: string): string {
  switch (type) {
    case "ABA_ROUTING":
      return "/routing-numbers";
    case "SORT_CODE":
      return "/sort-codes";
    case "BSB":
      return "/bsb";
    case "IFSC":
      return "/ifsc";
    case "CNAPS":
      return "/cnaps";
    default:
      return `/countries/${iso2}`;
  }
}
