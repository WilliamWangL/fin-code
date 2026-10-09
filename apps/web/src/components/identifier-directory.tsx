"use client";

import { useTranslations } from "next-intl";

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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
 * Static identifier directory (keeps directory pages static for SSG/SEO).
 * The preview rows are rendered as-is; everything beyond the preview lives
 * behind the registered API, so the CTA below the table routes visitors who
 * need more to sign up or sign in.
 */
export function IdentifierDirectory({ rows }: { rows: IdentifierRow[] }) {
  const t = useTranslations("common");

  return (
    <div className="space-y-4">
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
          {rows.map((row) => (
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
