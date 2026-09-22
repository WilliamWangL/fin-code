import { ExternalLink, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { identifierTypeLabel, type IdentifierTypeConfig } from "@/lib/directory";
import {
  countryByIso2,
  formatIdentifier,
  hrefForIdentifier,
  type IdentifierEntry,
} from "@/lib/data";
import { sourceById } from "@/lib/data/sources";
import {
  checkAbaFormat,
  checkBsbFormat,
  checkCnapsFormat,
  checkIfscFormat,
  checkSortCodeFormat,
  checkSwiftFormat,
} from "@/lib/identifiers";
import { alternatesFor, siteConfig } from "@/lib/site";

function formatCheckFor(type: string, value: string) {
  switch (type) {
    case "SWIFT":
      return checkSwiftFormat(value);
    case "ABA_ROUTING":
      return checkAbaFormat(value);
    case "SORT_CODE":
      return checkSortCodeFormat(value);
    case "BSB":
      return checkBsbFormat(value);
    case "IFSC":
      return checkIfscFormat(value);
    case "CNAPS":
      return checkCnapsFormat(value);
    default:
      return undefined;
  }
}

export interface IdentifierDetailProps {
  locale: string;
  config: IdentifierTypeConfig;
  entry: IdentifierEntry;
}

/**
 * Shared renderer for identifier detail pages
 * (/swift-codes/[code], /routing-numbers/[number], ...).
 *
 * Follows the SEO page template from the specification: title, H1,
 * breadcrumb, summary, bank information, related codes, FAQ, last updated.
 */
export async function IdentifierDetail({ locale, config, entry }: IdentifierDetailProps) {
  const { identifier, institution } = entry;
  const country = countryByIso2[institution.country];
  const source = sourceById[identifier.sourceId];
  const common = await getTranslations({ locale, namespace: "common" });
  const detail = await getTranslations({ locale, namespace: "detail" });
  const tool = await getTranslations({ locale, namespace: `tool.${config.messageNamespace}` });

  const displayValue = formatIdentifier(identifier.type, identifier.value);
  const formatCheck = formatCheckFor(identifier.type, identifier.value);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: tool("title"), href: config.basePath },
    { label: displayValue },
  ];

  // Related identifiers of the same type in the same country (other institutions).
  const related = (await import("@/lib/data"))
    .listIdentifiersByCountry(identifier.type, institution.country)
    .filter((candidate) => candidate.institution.slug !== institution.slug)
    .slice(0, 6);

  const faqItems = [
    { question: tool("detailFaq1Q"), answer: tool("detailFaq1A") },
    { question: tool("detailFaq2Q"), answer: tool("detailFaq2A") },
  ];

  const typeLabel = identifierTypeLabel(common, identifier.type);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={
          <span className="font-mono break-all">
            {displayValue}
            <span className="mt-2 block font-sans text-base font-medium text-muted-foreground">
              {typeLabel} · {institution.nameEn}
            </span>
          </span>
        }
        description={undefined}
        breadcrumbs={breadcrumbs}
        badge={
          identifier.verified ? (
            <Badge variant="success">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {common("verified")}
            </Badge>
          ) : (
            <Badge variant="outline">{common("unverified")}</Badge>
          )
        }
      />

      {/* ── Identifier summary ─────────────────────────────────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{detail("summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("identifier")}
                </dt>
                <dd className="mt-1 font-mono text-lg font-semibold break-all">{displayValue}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("type")}
                </dt>
                <dd className="mt-1 text-sm font-medium">{typeLabel}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("bank")}
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  <Link href={`/banks/${institution.slug}`} className="text-primary hover:underline">
                    {institution.nameEn}
                  </Link>
                </dd>
              </div>
              {identifier.city && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {common("city")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{identifier.city}</dd>
                </div>
              )}
              {country && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {common("country")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    <Link href={`/countries/${country.iso2}`} className="text-primary hover:underline">
                      {country.nameEn} ({country.iso2})
                    </Link>
                  </dd>
                </div>
              )}
              {identifier.label && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {common("branch")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{identifier.label}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("status")}
                </dt>
                <dd className="mt-1 text-sm font-medium">{common("active")}</dd>
              </div>
            </dl>

            {formatCheck && (
              <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {detail("formatCheck")}
                </p>
                <p className="mt-1.5 text-sm">{formatCheck.detail}</p>
              </div>
            )}

            <p className="mt-6 text-xs text-muted-foreground">
              {detail("sourceNote", {
                source: source?.name ?? identifier.sourceId,
                type: source?.sourceType ?? "—",
                retrievedAt: source?.retrievedAt ?? "—",
              })}
            </p>
          </CardContent>
        </Card>

        {/* ── Bank information ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{detail("bankInformation")}</CardTitle>
            <CardDescription>{institution.shortName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {detail("legalName")}
                </dt>
                <dd className="mt-0.5 font-medium">{institution.legalName}</dd>
              </div>
              {institution.nameLocal && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {detail("localName")}
                  </dt>
                  <dd className="mt-0.5 font-medium">{institution.nameLocal}</dd>
                </div>
              )}
              {country && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {detail("hq")}
                  </dt>
                  <dd className="mt-0.5">
                    {institution.branches[0]?.city}, {country.nameEn}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {common("website")}
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={institution.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {new URL(institution.website).hostname.replace("www.", "")}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </dd>
              </div>
            </dl>
            <Link
              href={`/banks/${institution.slug}`}
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              {institution.nameEn} →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── All identifiers of this institution ─────────────────────────── */}
      {institution.identifiers.length > 0 && (
        <section aria-labelledby="all-identifiers" className="mt-10">
          <h2 id="all-identifiers" className="text-xl font-semibold tracking-tight">
            {detail("allIdentifiers")}
          </h2>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{common("type")}</TableHead>
                  <TableHead>{common("value")}</TableHead>
                  <TableHead>{common("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institution.identifiers.map((item) => (
                  <TableRow key={`${item.type}-${item.value}`}>
                    <TableCell className="text-sm">
                      {identifierTypeLabel(common, item.type)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      <Link
                        href={hrefForIdentifier(item.type, item.value)}
                        className="text-primary hover:underline"
                      >
                        {formatIdentifier(item.type, item.value)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {item.verified ? (
                        <Badge variant="success">{common("verified")}</Badge>
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

      {/* ── Related codes ───────────────────────────────────────────────── */}
      {related.length > 0 && country && (
        <section aria-labelledby="related-codes" className="mt-10">
          <h2 id="related-codes" className="text-xl font-semibold tracking-tight">
            {common("relatedBanks", { country: country.nameEn })}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((candidate) => (
              <li key={`${candidate.identifier.type}-${candidate.identifier.value}`}>
                <Link
                  href={hrefForIdentifier(candidate.identifier.type, candidate.identifier.value)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-sm font-medium">
                      {formatIdentifier(candidate.identifier.type, candidate.identifier.value)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {candidate.institution.nameEn}
                    </span>
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {identifierTypeLabel(common, candidate.identifier.type)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section aria-labelledby="detail-faq" className="mt-10">
        <h2 id="detail-faq" className="text-xl font-semibold tracking-tight">
          {tool("faqTitle")}
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
        <p className="mt-4 text-xs text-muted-foreground">
          {common("lastUpdated")}: {source?.retrievedAt ?? "—"}
        </p>
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
          name: tool("metaTitleDetail", { code: displayValue, bank: institution.nameEn }),
          description: tool("metaDescriptionDetail", {
            code: displayValue,
            bank: institution.nameEn,
            country: country?.nameEn ?? institution.country,
          }),
          inLanguage: locale,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
        }}
      />
    </div>
  );
}

/** Shared metadata generator for identifier detail pages. */
export async function identifierDetailMetadata(
  locale: string,
  config: IdentifierTypeConfig,
  code: string,
) {
  const { getIdentifier, formatIdentifier } = await import("@/lib/data");
  const entry = getIdentifier(config.type, code);
  const tool = await getTranslations({
    locale,
    namespace: `tool.${config.messageNamespace}`,
  });
  if (!entry) {
    return { title: tool("title"), alternates: alternatesFor(locale, config.basePath) };
  }
  const country = countryByIso2[entry.institution.country];
  return {
    title: tool("metaTitleDetail", {
      code: formatIdentifier(config.type, entry.identifier.value),
      bank: entry.institution.nameEn,
    }),
    description: tool("metaDescriptionDetail", {
      code: formatIdentifier(config.type, entry.identifier.value),
      bank: entry.institution.nameEn,
      country: country?.nameEn ?? entry.institution.country,
    }),
    alternates: alternatesFor(
      locale,
      `${config.basePath}/${formatIdentifier(config.type, entry.identifier.value)}`,
    ),
  };
}
