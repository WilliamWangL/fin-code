"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
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

export interface BankRow {
  slug: string;
  nameEn: string;
  shortName: string;
  countryName: string;
  countryIso2: string;
  countryHref: string;
  identifiersCount: number;
  branchesCount: number;
  primaryIdentifier: string;
  primaryIdentifierHref: string;
}

export interface BankCountryOption {
  iso2: string;
  name: string;
}

/**
 * Client-side filterable bank directory (keeps the page static for SSG/SEO
 * while providing instant search UX on the preview dataset).
 */
export function BankDirectory({
  rows,
  countries,
}: {
  rows: BankRow[];
  countries: BankCountryOption[];
}) {
  const t = useTranslations("common");
  const banks = useTranslations("banks");
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (country !== "all" && row.countryIso2 !== country) return false;
      if (!q) return true;
      return (
        row.nameEn.toLowerCase().includes(q) ||
        row.shortName.toLowerCase().includes(q) ||
        row.countryName.toLowerCase().includes(q) ||
        row.primaryIdentifier.toLowerCase().includes(q)
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
          placeholder={banks("searchPlaceholder")}
          aria-label={banks("searchPlaceholder")}
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
          {banks("resultCount", { count: filtered.length })}
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
              <TableHead>{t("bank")}</TableHead>
              <TableHead>{t("identifier")}</TableHead>
              <TableHead>{t("country")}</TableHead>
              <TableHead>{banks("identifiersColumn")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.slug}>
                <TableCell>
                  <Link href={`/banks/${row.slug}`} className="text-sm font-medium hover:underline">
                    {row.nameEn}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{row.shortName}</span>
                </TableCell>
                <TableCell className="font-mono text-sm font-medium">
                  <Link href={row.primaryIdentifierHref} className="text-primary hover:underline">
                    {row.primaryIdentifier}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={row.countryHref} className="text-sm hover:underline">
                    {row.countryName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {banks("identifiersCount", { count: row.identifiersCount })}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
