"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

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
 * Static bank directory (keeps the page static for SSG/SEO). The preview
 * rows are rendered as-is; the full directory is served by the registered
 * API, so the CTA below the table routes interested visitors to sign up.
 */
export function BankDirectory({ rows }: { rows: BankRow[] }) {
  const t = useTranslations("common");
  const banks = useTranslations("banks");

  return (
    <div className="space-y-4">
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
          {rows.map((row) => (
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

      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm font-medium">{t("directoryCtaTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("directoryCtaBody")}
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className={cn(buttonVariants())}>
            {t("getApiKey")}
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {t("signIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
