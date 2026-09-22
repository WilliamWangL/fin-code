import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import {
  IdentifierDirectoryPage,
  identifierDirectoryMetadata,
} from "@/components/identifier-directory-page";
import { identifierTypeConfigs } from "@/lib/directory";

const config = identifierTypeConfigs.SORT_CODE;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return identifierDirectoryMetadata(locale, config);
}

export default async function SortCodesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <IdentifierDirectoryPage locale={locale} config={config} />;
}
