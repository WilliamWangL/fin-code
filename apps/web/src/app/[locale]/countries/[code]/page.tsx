import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CountryDetail } from "@/components/country-detail";
import { countries, countryByIso2, ibanFormatByCountry } from "@/lib/data";
import { identifierTypeLabel } from "@/lib/directory";
import { alternatesFor } from "@/lib/site";

export const revalidate = 86400;

export function generateStaticParams() {
  return countries.map((country) => ({ code: country.iso2 }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const country = countryByIso2[code.toUpperCase()];
  if (!country) return {};
  const t = await getTranslations({ locale, namespace: "countries" });
  const common = await getTranslations({ locale, namespace: "common" });
  const format = ibanFormatByCountry[country.iso2];
  const ibanSentence = format
    ? t("countryUsesIban", { length: format.length })
    : t("countryNoIban", { country: country.nameEn });
  return {
    title: t("countryMetaTitle", { country: country.nameEn }),
    description: t("countryMetaDescription", {
      country: country.nameEn,
      ibanSentence,
      localIdentifier: identifierTypeLabel(
        common,
        country.localIdentifierType ?? "SWIFT",
      ),
    }),
    alternates: alternatesFor(locale, `/countries/${country.iso2}`),
  };
}

export default async function CountryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const country = countryByIso2[code.toUpperCase()];
  if (!country) {
    notFound();
  }

  return <CountryDetail locale={locale} country={country} page={1} />;
}
