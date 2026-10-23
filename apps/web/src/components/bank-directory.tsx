"use client";

import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { matchSegments, searchBanks, type BankSearchDoc } from "@/lib/banks-search";
import { cn } from "@/lib/utils";

/** Directory row: searchable fields plus the pre-rendered display values. */
export interface BankRow extends BankSearchDoc {
  countryHref: string;
  identifiersCount: number;
  branchesCount: number;
  primaryIdentifierHref?: string;
}

export interface BankCountryOption {
  iso2: string;
  name: string;
}

/** Fixed locale so SSR and client hydration agree on digit grouping. */
const digits = new Intl.NumberFormat("en-US");

/** DOM guard: render at most this many filtered rows; the count line and the
 * truncation hint communicate the true match total. */
const MAX_MATCH_ROWS = 100;

function Highlight({ text, query }: { text: string; query: string }) {
  const segments = matchSegments(text, query);
  if (!segments) return <>{text}</>;
  return (
    <>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark key={index} className="rounded-sm bg-primary/15 px-0.5 text-inherit">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function chipClass(active: boolean): string {
  return cn(
    "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors",
    active
      ? "border-primary bg-primary/5 font-medium text-primary"
      : "border-border bg-card hover:border-primary/50",
  );
}

/**
 * The table is shared by the interactive directory and its Suspense
 * fallback, so the prerendered HTML already contains every row (SEO) and
 * hydration only layers the search controls on top.
 */
function DirectoryTable({ rows, query }: { rows: BankRow[]; query: string }) {
  const common = useTranslations("common");
  const banks = useTranslations("banks");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{common("bank")}</TableHead>
          <TableHead>{common("identifier")}</TableHead>
          <TableHead>{common("country")}</TableHead>
          <TableHead className="text-right">{banks("identifiersColumn")}</TableHead>
          <TableHead className="text-right">{banks("branchesColumn")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.slug}>
            <TableCell>
              <Link
                href={`/banks/${row.slug}`}
                className="text-sm font-medium hover:underline"
              >
                <Highlight text={row.nameEn} query={query} />
              </Link>
              {row.shortName && row.shortName !== row.nameEn ? (
                <span className="block text-xs text-muted-foreground">
                  <Highlight text={row.shortName} query={query} />
                </span>
              ) : null}
            </TableCell>
            <TableCell className="font-mono text-sm font-medium">
              {row.primaryIdentifier ? (
                <Link
                  href={row.primaryIdentifierHref ?? `/banks/${row.slug}`}
                  className="text-primary hover:underline"
                >
                  {row.primaryIdentifier}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <Link href={row.countryHref} className="text-sm hover:underline">
                <Highlight text={row.countryName} query={query} />
              </Link>
            </TableCell>
            <TableCell className="text-right">
              {row.identifiersCount > 0 ? (
                <Badge variant="outline" className="tabular-nums">
                  {digits.format(row.identifiersCount)}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              {row.branchesCount > 0 ? (
                <Badge variant="outline" className="tabular-nums">
                  {digits.format(row.branchesCount)}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DirectoryCta() {
  const t = useTranslations("common");
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <p className="text-sm font-medium">{t("directoryCtaTitle")}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t("directoryCtaBody")}</p>
      <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/register" className={cn(buttonVariants())}>
          {t("getApiKey")}
        </Link>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
          {t("signIn")}
        </Link>
      </div>
    </div>
  );
}

function DirectoryFallback({ rows }: { rows: BankRow[] }) {
  const banks = useTranslations("banks");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-10 w-full rounded-lg border border-input bg-card sm:max-w-md" />
        <p className="hidden text-sm text-muted-foreground sm:block">
          {banks("topByCountry")}
        </p>
      </div>
      <DirectoryTable rows={rows} query="" />
      <DirectoryCta />
    </div>
  );
}

function BankDirectoryLive({
  rows,
  countries,
  countryCounts,
  searchPool,
}: {
  rows: BankRow[];
  countries: BankCountryOption[];
  /** Full-directory per-country totals; defaults to counting `rows`. */
  countryCounts?: Map<string, number>;
  /** Full-directory pool that searches and country filters run against;
   * defaults to `rows` (the spotlight list) when not provided. */
  searchPool?: BankRow[];
}) {
  const t = useTranslations("banks");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlQuery = searchParams.get("q") ?? "";
  const urlCountry = searchParams.get("country") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [country, setCountry] = useState(urlCountry);
  const syncedQs = useRef<string | null>(null);

  // Mirror the filters into the address bar (shareable links) without
  // pushing history entries. Debounced so typing does not rewrite per key.
  useEffect(() => {
    const params = new URLSearchParams();
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    if (country) params.set("country", country);
    const qs = params.toString();
    if (syncedQs.current === null) {
      syncedQs.current = qs;
      return;
    }
    if (qs === syncedQs.current) return;
    const timer = window.setTimeout(() => {
      syncedQs.current = qs;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, country, pathname, router]);

  // Adopt URL changes that did not originate from the inputs (back/forward).
  useEffect(() => {
    if (urlQuery !== query.trim()) setQuery(urlQuery);
    if (urlCountry !== country) setCountry(urlCountry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery, urlCountry]);

  const filtered = useMemo(() => {
    const pool = searchPool ?? rows;
    if (query.trim()) {
      const scored = searchBanks(pool, query, country || undefined);
      return scored ? scored.map((item) => item.doc) : [];
    }
    if (country) {
      // Biggest institutions first, in line with the spotlight ordering.
      return [...pool]
        .filter((row) => row.countryIso2 === country)
        .sort((a, b) => b.branchesCount - a.branchesCount);
    }
    return rows;
  }, [rows, searchPool, query, country]);

  const visible =
    filtered.length > MAX_MATCH_ROWS ? filtered.slice(0, MAX_MATCH_ROWS) : filtered;
  const truncated = filtered.length > visible.length;

  const counts = useMemo(() => {
    if (countryCounts) return countryCounts;
    const computed = new Map<string, number>();
    for (const row of rows) {
      computed.set(row.countryIso2, (computed.get(row.countryIso2) ?? 0) + 1);
    }
    return computed;
  }, [rows, countryCounts]);

  const totalCount = useMemo(
    () => (countryCounts ? Array.from(countryCounts.values()).reduce((sum, n) => sum + n, 0) : rows.length),
    [rows.length, countryCounts],
  );

  const filtering = query.trim().length > 0 || country.length > 0;
  const clearFilters = () => {
    setQuery("");
    setCountry("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clearSearch")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {filtering ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("matchedCount", { count: filtered.length, total: searchPool?.length ?? rows.length })}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setCountry("")} className={chipClass(!country)}>
          {t("filterByCountry")}
          <span className="text-xs opacity-70">{digits.format(totalCount)}</span>
        </button>
        {countries.map((option) => (
          <button
            key={option.iso2}
            type="button"
            onClick={() => setCountry(country === option.iso2 ? "" : option.iso2)}
            className={chipClass(country === option.iso2)}
          >
            {option.name}
            <span className="text-xs opacity-70">
              {digits.format(counts.get(option.iso2) ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <>
          <DirectoryTable rows={visible} query={query} />
          {truncated ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t("searchTruncated", { count: visible.length, total: filtered.length })}
            </p>
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <p className="text-sm font-medium">{t("noResultsTitle")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t("noResultsBody")}
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
            {t("clearFilters")}
          </Button>
        </div>
      )}

      <DirectoryCta />
    </div>
  );
}

/**
 * Static bank directory. The prerendered HTML carries the full row list;
 * once hydrated the client component adds name/code search, country filters
 * and keystroke highlighting over the same data - no API round-trip.
 */
export function BankDirectory({
  rows,
  countries,
  countryCounts,
  searchPool,
}: {
  rows: BankRow[];
  countries: BankCountryOption[];
  countryCounts?: Map<string, number>;
  searchPool?: BankRow[];
}) {
  return (
    <Suspense fallback={<DirectoryFallback rows={rows} />}>
      <BankDirectoryLive
        rows={rows}
        countries={countries}
        countryCounts={countryCounts}
        searchPool={searchPool}
      />
    </Suspense>
  );
}
