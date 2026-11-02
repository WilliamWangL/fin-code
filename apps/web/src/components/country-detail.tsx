import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
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
import {
  formatIdentifier,
  hrefForIdentifier,
  ibanFormatByCountry,
  institutions,
} from "@/lib/data";
import type { Country } from "@/lib/data/types";
import { identifierTypeLabel } from "@/lib/directory";
import { paginate } from "@/lib/pagination";
import { siteConfig } from "@/lib/site";
import { breadcrumbListJsonLd } from "@/lib/structured-data";

/**
 * Shared body of /countries/{iso2} and its paginated continuation pages.
 *
 * The listing is paged: a country with thousands of institutions used to be
 * rendered as one ~5 MB document, and Googlebot only reads the first ~2 MB of
 * a page, so most of the bank links were never discovered. Page 1 stays at
 * /countries/{iso2}; further pages live at /countries/{iso2}/page/{n}.
 */
export async function CountryDetail({
  locale,
  country,
  page,
}: {
  locale: string;
  country: Country;
  /** 1-based page number. */
  page: number;
}) {
  const t = await getTranslations({ locale, namespace: "countries" });
  const common = await getTranslations({ locale, namespace: "common" });

  const format = ibanFormatByCountry[country.iso2];
  const localBanks = institutions.filter(
    (institution) => institution.country === country.iso2,
  );
  const slice = paginate(localBanks, page);
  const paged = slice.totalPages > 1;
  const pageBanks = slice.items;

  // Identifiers of the institutions on this page; a paginated country would
  // otherwise repeat the whole country's identifier table on every page.
  const pageIdentifiers = pageBanks.flatMap((institution) =>
    institution.identifiers.map((identifier) => ({ identifier, institution })),
  );

  const ibanSentence = format
    ? t("countryUsesIban", { length: format.length })
    : t("countryNoIban", { country: country.nameEn });

  const basePath = `/countries/${country.iso2}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title"), href: "/countries" },
    { label: country.nameEn, href: paged && page > 1 ? basePath : undefined },
    ...(paged && page > 1 ? [{ label: `#${page}` }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={paged && page > 1 ? `${country.nameEn} · ${page}` : country.nameEn}
        description={country.nameLocal}
        breadcrumbs={breadcrumbs}
        badge={
          format ? (
            <Badge variant="success">
              {t("ibanSupported")} · {format.length}
            </Badge>
          ) : (
            <Badge variant="outline">{t("noIban")}</Badge>
          )
        }
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* ── IBAN format / payment system ────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("ibanFormatTitle")}</CardTitle>
            <CardDescription>{ibanSentence}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {format ? (
              <>
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
                <Link
                  href={`/iban/${country.iso2}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("viewIbanFormat")}
                </Link>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("countryNoIban", { country: country.nameEn })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Country summary ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{common("country")}</CardTitle>
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
                  {t("currency")}
                </dt>
                <dd className="mt-0.5 font-mono font-medium">{country.currency}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("localIdentifier")}
                </dt>
                <dd className="mt-0.5 font-medium">
                  {identifierTypeLabel(common, country.localIdentifierType ?? "SWIFT")}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("bank")}
                </dt>
                <dd className="mt-0.5 font-medium">
                  {common("resultsCount", { count: slice.total })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* ── Banks in country ──────────────────────────────────────────── */}
      <section aria-labelledby="country-banks" className="mt-10">
        <h2 id="country-banks" className="text-xl font-semibold tracking-tight">
          {t("banksTitle", { country: country.nameEn })}
        </h2>
        {pageBanks.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("noBanksInCountry", { country: country.nameEn })}
          </p>
        ) : (
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
                {pageBanks.map((institution) => {
                  const primary =
                    institution.identifiers.find((item) => item.type === "SWIFT") ??
                    institution.identifiers[0];
                  return (
                    <TableRow key={institution.slug}>
                      <TableCell>
                        <Link
                          href={`/banks/${institution.slug}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {institution.nameEn}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {institution.shortName}
                        </span>
                      </TableCell>
                      {primary ? (
                        <TableCell className="font-mono text-sm">
                          <Link
                            href={hrefForIdentifier(primary.type, primary.value)}
                            className="text-primary hover:underline"
                          >
                            {formatIdentifier(primary.type, primary.value)}
                          </Link>
                        </TableCell>
                      ) : (
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      )}
                      <TableCell className="text-sm">
                        {primary?.city ?? institution.branches[0]?.city ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <PaginationNav
              locale={locale}
              basePath={basePath}
              page={slice.page}
              totalPages={slice.totalPages}
              label={t("banksTitle", { country: country.nameEn })}
            />
          </div>
        )}
      </section>

      {/* ── Identifiers in country ────────────────────────────────────── */}
      {pageIdentifiers.length > 0 && (
        <section aria-labelledby="country-identifiers" className="mt-10">
          <h2 id="country-identifiers" className="text-xl font-semibold tracking-tight">
            {paged
              ? t("identifiersTitlePage", { country: country.nameEn })
              : t("identifiersTitle", { country: country.nameEn })}
          </h2>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{common("type")}</TableHead>
                  <TableHead>{common("value")}</TableHead>
                  <TableHead>{common("bank")}</TableHead>
                  <TableHead>{common("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageIdentifiers.map(({ identifier, institution }) => (
                  <TableRow key={`${identifier.type}-${identifier.value}`}>
                    <TableCell className="text-sm">
                      {identifierTypeLabel(common, identifier.type)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      <Link
                        href={hrefForIdentifier(identifier.type, identifier.value)}
                        className="text-primary hover:underline"
                      >
                        {formatIdentifier(identifier.type, identifier.value)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/banks/${institution.slug}`}
                        className="text-sm hover:underline"
                      >
                        {institution.shortName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {identifier.verified ? (
                        <Badge variant="success">
                          <ShieldCheck className="h-3 w-3" aria-hidden />
                          {common("verified")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{common("unverified")}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <JsonLd data={breadcrumbListJsonLd(breadcrumbs, locale)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: t("countryMetaTitle", { country: country.nameEn }),
          description: t("countryMetaDescription", {
            country: country.nameEn,
            ibanSentence,
            localIdentifier: identifierTypeLabel(
              common,
              country.localIdentifierType ?? "SWIFT",
            ),
          }),
          inLanguage: locale,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
        }}
      />
    </div>
  );
}
