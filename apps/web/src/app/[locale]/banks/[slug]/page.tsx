import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { BranchExplorer, type SnapshotBranch } from "@/components/branch-explorer";
import type { BreadcrumbItem } from "@/components/breadcrumb";
import { CodeBlock } from "@/components/code-block";
import { CopyButton } from "@/components/copy-button";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { countryByIso2, formatIdentifier, hrefForIdentifier, institutions } from "@/lib/data";
import type { Identifier, InstitutionType } from "@/lib/data/types";
import { identifierTypeLabel } from "@/lib/directory";
import { sourceById } from "@/lib/data/sources";
import { alternatesFor, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export const revalidate = 86400;

export function generateStaticParams() {
  return institutions.map((institution) => ({ slug: institution.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "banks" });
  const institution = institutions.find((item) => item.slug === slug);
  if (!institution) return {};
  const country = countryByIso2[institution.country];
  return {
    title: t("bankMetaTitle", { bank: institution.nameEn }),
    description: t("bankMetaDescription", {
      bank: institution.nameEn,
      country: country?.nameEn ?? institution.country,
    }),
    alternates: alternatesFor(locale, `/banks/${institution.slug}`),
  };
}

/** Bare hostname for display; null when the record has no usable website. */
function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Public API path that returns the record behind an identifier. */
function apiPathFor(identifier: Identifier): string {
  switch (identifier.type) {
    case "SWIFT":
    case "BIC":
      return `/swift/${identifier.value}`;
    case "ABA_ROUTING":
      return `/routing/${identifier.value}`;
    case "SORT_CODE":
      return `/sort-code/${formatIdentifier("SORT_CODE", identifier.value)}`;
    case "BSB":
      return `/bsb/${formatIdentifier("BSB", identifier.value)}`;
    case "IFSC":
      return `/ifsc/${identifier.value}`;
    case "CNAPS":
      return `/cnaps/${identifier.value}`;
    default:
      return `/banks/search?q=${encodeURIComponent(identifier.value)}&limit=5`;
  }
}

export default async function BankDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const institution = institutions.find((item) => item.slug === slug);
  if (!institution) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "banks" });
  const common = await getTranslations({ locale, namespace: "common" });
  const detail = await getTranslations({ locale, namespace: "detail" });

  const country = countryByIso2[institution.country];
  const headOffice = institution.branches[0];
  const websiteHost = hostnameOf(institution.website);
  // Snapshot-backed institutions carry thousands of branches in the exported
  // dataset; only the head office row lives in `branches` at build time.
  const branchCount = institution.branchSnapshotCount ?? institution.branches.length;

  const typeLabels: Record<InstitutionType, string> = {
    BANK: detail("typeBank"),
    CENTRAL_BANK: detail("typeCentralBank"),
    CREDIT_UNION: detail("typeCreditUnion"),
    PAYMENT_INSTITUTION: detail("typePaymentInstitution"),
  };
  const typeLabel = typeLabels[institution.institutionType] ?? detail("typeBank");

  const primary =
    institution.identifiers.find((item) => item.type === "SWIFT") ??
    institution.identifiers[0];
  const apiPath = primary
    ? apiPathFor(primary)
    : `/banks/search?q=${encodeURIComponent(institution.nameEn)}&limit=5`;
  const apiSnippet = `curl -s "${siteConfig.apiBaseUrl}${apiPath}" \\\n  -H "Authorization: Bearer sk_xxx"`;

  // Server-rendered head office row; the explorer replaces it with the full
  // snapshot once the static asset is fetched.
  const initialBranches: SnapshotBranch[] = institution.branches.slice(0, 1).map((branch) => ({
    name: branch.name,
    nameLocal: branch.nameLocal ?? null,
    city: branch.city || null,
    state: null,
    address: branch.address ?? null,
    postalCode: null,
    code: null,
  }));

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title"), href: "/banks" },
    { label: institution.shortName },
  ];

  // Other institutions in the same country.
  const related = institutions
    .filter((item) => item.country === institution.country && item.slug !== institution.slug)
    .slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={institution.nameEn}
        description={
          institution.legalName !== institution.nameEn ? institution.legalName : undefined
        }
        breadcrumbs={breadcrumbs}
        badge={<Badge variant="outline">{typeLabel}</Badge>}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* ── Overview ────────────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("overview")}</CardTitle>
            <CardDescription>{institution.shortName}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {detail("legalName")}
                </dt>
                <dd className="mt-1 text-sm font-medium">{institution.legalName}</dd>
              </div>
              {institution.nameLocal && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {detail("localName")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{institution.nameLocal}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("country")}
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  <Link
                    href={`/countries/${institution.country}`}
                    className="text-primary hover:underline"
                  >
                    {country?.nameEn ?? institution.country} ({institution.country})
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {detail("institutionType")}
                </dt>
                <dd className="mt-1 text-sm font-medium">{typeLabel}</dd>
              </div>
              {headOffice && (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {common("headOffice")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {[headOffice.name, headOffice.city].filter(Boolean).join(", ")}
                    {headOffice.address ? ` · ${headOffice.address}` : ""}
                  </dd>
                </div>
              )}
              {websiteHost && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {common("website")}
                  </dt>
                  <dd className="mt-1">
                    <a
                      href={institution.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      {websiteHost}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* ── Quick stats ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{detail("allIdentifiers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("identifiersColumn")}
                </dt>
                <dd className="mt-0.5 font-medium">
                  {t("identifiersCount", { count: institution.identifiers.length })}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("branchesColumn")}
                </dt>
                <dd className="mt-0.5 font-medium">{t("branchesCount", { count: branchCount })}</dd>
              </div>
              {country && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {common("country")}
                  </dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/iban/${country.iso2}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {country.nameEn}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* ── Identifiers ───────────────────────────────────────────────── */}
      {institution.identifiers.length > 0 && (
        <section aria-labelledby="bank-identifiers" className="mt-10">
          <h2 id="bank-identifiers" className="text-xl font-semibold tracking-tight">
            {detail("allIdentifiers")}
          </h2>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{common("type")}</TableHead>
                  <TableHead>{common("value")}</TableHead>
                  <TableHead>{common("branch")}</TableHead>
                  <TableHead>{common("status")}</TableHead>
                  <TableHead>{common("dataSource")}</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">{common("copy")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institution.identifiers.map((identifier) => {
                  const source = sourceById[identifier.sourceId];
                  const formatted = formatIdentifier(identifier.type, identifier.value);
                  return (
                    <TableRow key={`${identifier.type}-${identifier.value}`}>
                      <TableCell className="text-sm">
                        {identifierTypeLabel(common, identifier.type)}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        <Link
                          href={hrefForIdentifier(identifier.type, identifier.value)}
                          className="text-primary hover:underline"
                        >
                          {formatted}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {identifier.label ?? identifier.city ?? "—"}
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
                      <TableCell className="text-xs text-muted-foreground">
                        {source?.name ?? identifier.sourceId}
                        {source ? ` · ${source.retrievedAt}` : ""}
                      </TableCell>
                      <TableCell>
                        <CopyButton value={formatted} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* ── Branches ──────────────────────────────────────────────────── */}
      {institution.branchSnapshotKey ? (
        <section aria-labelledby="bank-branches" className="mt-10">
          <h2 id="bank-branches" className="text-xl font-semibold tracking-tight">
            {detail("branchInformation")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("branchesCount", { count: branchCount })}
          </p>
          <div className="mt-4">
            <BranchExplorer
              snapshotKey={institution.branchSnapshotKey}
              initialBranches={initialBranches}
            />
          </div>
        </section>
      ) : institution.branches.length > 0 ? (
        <section aria-labelledby="bank-branches" className="mt-10">
          <h2 id="bank-branches" className="text-xl font-semibold tracking-tight">
            {detail("branchInformation")}
          </h2>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{common("branch")}</TableHead>
                  <TableHead>{common("city")}</TableHead>
                  <TableHead>{common("address")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institution.branches.map((branch) => (
                  <TableRow key={branch.slug}>
                    <TableCell className="text-sm font-medium">
                      {branch.name}
                      {branch.nameLocal ? ` · ${branch.nameLocal}` : ""}
                    </TableCell>
                    <TableCell className="text-sm">{branch.city}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {branch.address ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      {/* ── API conversion card ───────────────────────────────────────── */}
      <section aria-labelledby="bank-api" className="mt-10">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 id="bank-api" className="text-lg font-semibold tracking-tight">
                {t("apiCardTitle")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("apiCardBody")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/register" className={cn(buttonVariants())}>
                  {common("getApiKey")}
                </Link>
                <Link href="/docs" className={cn(buttonVariants({ variant: "outline" }))}>
                  {common("learnMore")}
                </Link>
              </div>
            </div>
            <CodeBlock code={apiSnippet} language="bash" />
          </div>
        </div>
      </section>

      {/* ── Related banks ─────────────────────────────────────────────── */}
      {related.length > 0 && country && (
        <section aria-labelledby="related-banks" className="mt-10">
          <h2 id="related-banks" className="text-xl font-semibold tracking-tight">
            {common("relatedBanks", { country: country.nameEn })}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((candidate) => {
              const swift =
                candidate.identifiers.find((item) => item.type === "SWIFT") ??
                candidate.identifiers[0];
              const candidateBranches =
                candidate.branchSnapshotCount ?? candidate.branches.length;
              return (
                <li key={candidate.slug}>
                  <Link
                    href={`/banks/${candidate.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {candidate.nameEn}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {swift ? formatIdentifier(swift.type, swift.value) : candidate.shortName}
                      </span>
                    </span>
                    {candidateBranches > 0 ? (
                      <Badge variant="outline" className="shrink-0">
                        {t("branchesCount", { count: candidateBranches })}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        {t("identifiersCount", { count: candidate.identifiers.length })}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
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
          name: institution.nameEn,
          description: t("bankMetaDescription", {
            bank: institution.nameEn,
            country: country?.nameEn ?? institution.country,
          }),
          inLanguage: locale,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BankOrCreditUnion",
          name: institution.nameEn,
          legalName: institution.legalName,
          ...(institution.nameLocal ? { alternateName: institution.nameLocal } : {}),
          url: `${siteConfig.url}/${locale}/banks/${institution.slug}`,
          ...(institution.website ? { sameAs: [institution.website] } : {}),
          ...(country ? { areaServed: country.nameEn } : {}),
          ...(headOffice?.city
            ? {
                address: {
                  "@type": "PostalAddress",
                  ...(headOffice.address ? { streetAddress: headOffice.address } : {}),
                  addressLocality: headOffice.city,
                  addressCountry: institution.country,
                },
              }
            : {}),
          identifier: institution.identifiers.map((identifier) => ({
            "@type": "PropertyValue",
            propertyID: identifier.type,
            value: formatIdentifier(identifier.type, identifier.value),
          })),
        }}
      />
    </div>
  );
}
