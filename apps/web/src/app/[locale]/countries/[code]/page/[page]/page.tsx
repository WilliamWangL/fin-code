import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CountryDetail } from "@/components/country-detail";
import { countries, countryByIso2, ibanFormatByCountry, institutions } from "@/lib/data";
import { paginate, parsePageSegment } from "@/lib/pagination";
import { alternatesFor } from "@/lib/site";

export const revalidate = 86400;

/** Total listing pages for a country, at the shared page size. */
function pagesOf(iso2: string): number {
  const total = institutions.filter((institution) => institution.country === iso2).length;
  return paginate(new Array(total), 1).totalPages;
}

/**
 * Continuation pages of the country listing. Page 1 keeps living at
 * /countries/{iso2}; this route starts at page 2 so the two never compete for
 * the same content.
 */
export function generateStaticParams() {
  return countries.flatMap((country) => {
    const totalPages = pagesOf(country.iso2);
    return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
      code: country.iso2,
      page: String(index + 2),
    }));
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string; page: string }>;
}): Promise<Metadata> {
  const { locale, code, page } = await params;
  const country = countryByIso2[code.toUpperCase()];
  const parsed = parsePageSegment(page);
  if (!country || parsed === null || parsed > pagesOf(country.iso2)) return {};
  const t = await getTranslations({ locale, namespace: "countries" });
  const format = ibanFormatByCountry[country.iso2];
  return {
    title: t("countryPageMetaTitle", { country: country.nameEn, page: parsed }),
    description: t("countryMetaDescription", {
      country: country.nameEn,
      ibanSentence: format
        ? t("countryUsesIban", { length: format.length })
        : t("countryNoIban", { country: country.nameEn }),
      localIdentifier: country.localIdentifierType ?? "SWIFT",
    }),
    // Each page canonicalises to itself; collapsing the series onto page 1
    // would hide the deeper rows from the index.
    alternates: alternatesFor(locale, `/countries/${country.iso2}/page/${parsed}`),
  };
}

export default async function CountryPageSegment({
  params,
}: {
  params: Promise<{ locale: string; code: string; page: string }>;
}) {
  const { locale, code, page } = await params;
  setRequestLocale(locale);
  const country = countryByIso2[code.toUpperCase()];
  const parsed = parsePageSegment(page);
  if (!country || parsed === null || parsed > pagesOf(country.iso2)) {
    notFound();
  }

  return <CountryDetail locale={locale} country={country} page={parsed} />;
}
