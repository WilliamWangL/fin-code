"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/lib/site";

export interface IdentifierRow {
  displayValue: string;
  href: string;
  institutionName: string;
  institutionHref: string;
  countryName: string;
  countryIso2: string;
  countryHref: string;
  city?: string;
  verified: boolean;
}

export interface CountryOption {
  iso2: string;
  name: string;
}

/**
 * Live lookup against the data API when the static preview list has no
 * match. Only the two directory-backed types are supported.
 */
type DirectoryApiLookup = "swift" | "routing";

type ApiLookupState = "idle" | "loading" | "found" | "notfound" | "limited" | "error";

interface ApiLookupData {
  swift_code?: string;
  routing_number?: string;
  checksum_valid?: boolean;
  format?: {
    institution_code?: string;
    country_code?: string;
    location_code?: string;
    branch_code?: string;
  };
  bank?: {
    name_en?: string;
    country?: string;
  };
  city?: string;
  state?: string;
  status?: string;
}

const API_VALUE_PATTERN: Record<DirectoryApiLookup, RegExp> = {
  swift: /^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/,
  routing: /^\d{9}$/,
};

/**
 * Client-side filterable identifier directory (keeps directory pages static
 * for SSG/SEO while providing instant search UX on the small preview dataset).
 * When `apiLookup` is set and the query matches nothing locally, the component
 * falls back to a live API lookup and surfaces a registration prompt when the
 * dataset has no match either.
 */
export function IdentifierDirectory({
  rows,
  countries,
  apiLookup,
}: {
  rows: IdentifierRow[];
  countries: CountryOption[];
  apiLookup?: DirectoryApiLookup;
}) {
  const t = useTranslations("common");
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");
  const [apiState, setApiState] = useState<ApiLookupState>("idle");
  const [apiData, setApiData] = useState<ApiLookupData | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (country !== "all" && row.countryIso2 !== country) return false;
      if (!q) return true;
      return (
        row.displayValue.toLowerCase().includes(q) ||
        row.institutionName.toLowerCase().includes(q) ||
        row.countryName.toLowerCase().includes(q)
      );
    });
  }, [rows, query, country]);

  const trimmedQuery = query.trim();
  useEffect(() => {
    if (!apiLookup || filtered.length > 0 || !API_VALUE_PATTERN[apiLookup].test(trimmedQuery)) {
      setApiState("idle");
      setApiData(null);
      return;
    }
    const controller = new AbortController();
    setApiState("loading");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${siteConfig.apiBaseUrl}/${apiLookup}/${encodeURIComponent(trimmedQuery.toUpperCase())}`,
          { signal: controller.signal },
        );
        if (response.status === 200) {
          const body = (await response.json()) as { data?: ApiLookupData };
          setApiData(body.data ?? null);
          setApiState("found");
        } else if (response.status === 404) {
          setApiState("notfound");
        } else if (response.status === 429) {
          setApiState("limited");
        } else {
          setApiState("error");
        }
      } catch {
        if (!controller.signal.aborted) {
          setApiState("error");
        }
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [apiLookup, filtered.length, trimmedQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchFilter")}
          aria-label={t("searchFilter")}
          className="sm:max-w-xs"
        />
        <select
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          aria-label={t("allCountries")}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          <option value="all">{t("allCountries")}</option>
          {countries.map((option) => (
            <option key={option.iso2} value={option.iso2}>
              {option.name}
            </option>
          ))}
        </select>
        <p className="self-center text-sm text-muted-foreground" role="status">
          {t("resultsCount", { count: filtered.length })}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="space-y-4">
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {apiState === "loading"
              ? t("directoryApiLoading")
              : t("noResults")}
          </p>
          {apiState === "found" && apiData && (
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("directoryApiResult")}
              </p>
              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("value")}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-medium">
                    {apiData.swift_code ?? apiData.routing_number}
                  </dd>
                </div>
                {apiData.format?.institution_code && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("identifier")}
                    </dt>
                    <dd className="mt-1 font-mono text-sm">
                      {apiData.format.institution_code} {apiData.format.country_code}{" "}
                      {apiData.format.location_code} {apiData.format.branch_code ?? ""}
                    </dd>
                  </div>
                )}
                {apiData.bank?.name_en && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("bank")}
                    </dt>
                    <dd className="mt-1 text-sm">{apiData.bank.name_en}</dd>
                  </div>
                )}
                {(apiData.city || apiData.state) && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("city")}
                    </dt>
                    <dd className="mt-1 text-sm">
                      {[apiData.city, apiData.state].filter(Boolean).join(", ")}
                    </dd>
                  </div>
                )}
                {apiData.bank?.country && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("country")}
                    </dt>
                    <dd className="mt-1 text-sm">{apiData.bank.country}</dd>
                  </div>
                )}
                {typeof apiData.checksum_valid === "boolean" && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("status")}
                    </dt>
                    <dd className="mt-1 text-sm">
                      <Badge variant={apiData.checksum_valid ? "success" : "outline"}>
                        {apiData.checksum_valid ? t("verified") : t("unverified")}
                      </Badge>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          {(apiState === "notfound" || apiState === "limited" || apiState === "error") && (
            <div className="rounded-xl border border-primary/30 bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {apiState === "notfound" && t("directoryApiNotFound")}
                {apiState === "limited" && t("directoryApiLimited")}
                {apiState === "error" && t("directoryApiError")}
              </p>
              <p className="mt-2 text-sm font-medium">{t("directoryApiRegisterPrompt")}</p>
              <Link
                href="/register"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {t("getApiKey")}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("value")}</TableHead>
              <TableHead>{t("bank")}</TableHead>
              <TableHead>{t("country")}</TableHead>
              <TableHead>{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.href}>
                <TableCell className="font-mono text-sm font-medium">
                  <Link href={row.href} className="text-primary hover:underline">
                    {row.displayValue}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={row.institutionHref}
                    className="text-sm hover:underline"
                  >
                    {row.institutionName}
                  </Link>
                  {row.city && (
                    <span className="block text-xs text-muted-foreground">
                      {row.city}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={row.countryHref}
                    className="text-sm hover:underline"
                  >
                    {row.countryName}
                  </Link>
                </TableCell>
                <TableCell>
                  {row.verified ? (
                    <Badge variant="success">{t("verified")}</Badge>
                  ) : (
                    <Badge variant="outline">{t("unverified")}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
