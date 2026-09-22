"use client";

import { useMemo, useState } from "react";
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
 * Client-side filterable identifier directory (keeps directory pages static
 * for SSG/SEO while providing instant search UX on the small preview dataset).
 */
export function IdentifierDirectory({
  rows,
  countries,
}: {
  rows: IdentifierRow[];
  countries: CountryOption[];
}) {
  const t = useTranslations("common");
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");

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
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("noResults")}
        </p>
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
