import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { countryByIso2, ibanFormats } from "@/lib/data";
import { alternatesFor } from "@/lib/site";

import { IbanValidator } from "./iban-validator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "IBAN Checker — Validate IBAN Format & Checksum",
    description:
      "Free IBAN validator: check format, length, MOD-97 checksum and country structure, and extract the bank code and account number.",
    alternates: alternatesFor(locale, "/iban-checker"),
  };
}

export default async function IbanCheckerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tool" });
  const common = await getTranslations({ locale, namespace: "common" });

  const sorted = [...ibanFormats].sort((a, b) =>
    (countryByIso2[a.countryCode]?.nameEn ?? a.countryCode).localeCompare(
      countryByIso2[b.countryCode]?.nameEn ?? b.countryCode,
    ),
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("ibanCheckerTitle")}
        description={t("ibanCheckerSubtitle")}
        breadcrumbs={[{ label: "IBAN Checker" }]}
      />

      <div className="mt-8 max-w-3xl">
        <IbanValidator />
      </div>

      <section aria-labelledby="iban-country-table" className="mt-16">
        <h2 id="iban-country-table" className="text-2xl font-bold tracking-tight">
          {t("countryTableTitle")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("countryTableSubtitle")}</p>
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{common("country")}</TableHead>
                <TableHead>ISO</TableHead>
                <TableHead>{common("length")}</TableHead>
                <TableHead>{common("structure")}</TableHead>
                <TableHead>{common("example")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((format) => {
                const country = countryByIso2[format.countryCode];
                return (
                  <TableRow key={format.countryCode}>
                    <TableCell>
                      {country ? (
                        <Link
                          href={`/iban/${format.countryCode}`}
                          className="font-medium hover:underline"
                        >
                          {country.nameEn}
                        </Link>
                      ) : (
                        format.countryCode
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{format.countryCode}</TableCell>
                    <TableCell>{format.length}</TableCell>
                    <TableCell className="font-mono text-xs">{format.structure}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {format.example ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
