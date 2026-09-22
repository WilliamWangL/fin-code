import type { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CheckItem } from "@/components/check-item";
import { PageHeader } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { detectIdentifierType, formatIdentifier, searchAll } from "@/lib/data";
import { validateIban } from "@/lib/iban";

export async function generateMetadata(): Promise<Metadata> {
  // Search result pages must not be indexed.
  return { robots: { index: false, follow: true } };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const t = await getTranslations({ locale, namespace: "search" });
  const common = await getTranslations({ locale, namespace: "common" });

  const query = (q ?? "").trim();
  const results = query ? searchAll(query) : [];
  const detectedType = query ? detectIdentifierType(query) : "UNKNOWN";

  const grouped = {
    identifier: results.filter((result) => result.kind === "identifier"),
    bank: results.filter((result) => result.kind === "bank"),
    branch: results.filter((result) => result.kind === "branch"),
    country: results.filter((result) => result.kind === "country"),
  };

  // IBAN queries additionally get an inline validation card.
  const ibanValidation = detectedType === "IBAN" ? validateIban(query) : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={query ? t("for", { query }) : t("metaTitle")}
        description={query ? undefined : t("try")}
      />

      <div className="mt-8 max-w-2xl">
        <SearchBox />
      </div>

      {query && detectedType !== "UNKNOWN" && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("detected")}:{" "}
          <Badge variant="secondary" className="ml-1 font-mono">
            {detectedType}
          </Badge>
        </p>
      )}

      {ibanValidation && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SearchIcon className="h-4 w-4" aria-hidden />
              {t("ibanDetected")}
            </CardTitle>
            <CardDescription className="font-mono">
              {formatIdentifier("IBAN", ibanValidation.normalized)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {ibanValidation.checks.map((check) => (
                <CheckItem
                  key={check.id}
                  passed={check.passed}
                  label={check.label}
                  detail={check.detail}
                />
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              {ibanValidation.valid ? t("ibanValid") : t("ibanInvalid")}{" "}
              {common("formatOnlyNote")}
            </p>
            <Link
              href={`/iban-checker?iban=${encodeURIComponent(ibanValidation.normalized)}`}
              className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
            >
              {t("openChecker")} →
            </Link>
          </CardContent>
        </Card>
      )}

      {query && results.length === 0 && !ibanValidation && (
        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">{t("none", { query })}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("try")}</p>
        </div>
      )}

      <div className="mt-8 space-y-10">
        {grouped.identifier.length > 0 && (
          <section aria-labelledby="results-identifiers">
            <h2 id="results-identifiers" className="text-lg font-semibold">
              {t("identifiers")}
            </h2>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {grouped.identifier.map((result, index) => (
                <li key={`${result.href}-${index}`}>
                  <Link
                    href={result.href}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-sm font-medium text-primary">
                        {result.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {result.subtitle}
                      </span>
                    </span>
                    <Badge variant="outline" className="shrink-0 font-mono">
                      {result.identifierType}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {grouped.bank.length > 0 && (
          <section aria-labelledby="results-banks">
            <h2 id="results-banks" className="text-lg font-semibold">
              {t("banks")}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.bank.map((result, index) => (
                <li key={`${result.href}-${index}`}>
                  <Link
                    href={result.href}
                    className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <span className="block text-sm font-semibold">{result.title}</span>
                    {result.subtitle && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {result.subtitle}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {grouped.branch.length > 0 && (
          <section aria-labelledby="results-branches">
            <h2 id="results-branches" className="text-lg font-semibold">
              {t("branches")}
            </h2>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {grouped.branch.map((result, index) => (
                <li key={`${result.href}-${index}`}>
                  <Link
                    href={result.href}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="font-medium">{result.title}</span>
                    <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {grouped.country.length > 0 && (
          <section aria-labelledby="results-countries">
            <h2 id="results-countries" className="text-lg font-semibold">
              {t("countries")}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.country.map((result, index) => (
                <li key={`${result.href}-${index}`}>
                  <Link
                    href={result.href}
                    className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <span className="block text-sm font-semibold">{result.title}</span>
                    {result.subtitle && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {result.subtitle}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
