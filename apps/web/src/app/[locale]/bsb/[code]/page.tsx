import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import {
  IdentifierDetail,
  identifierDetailMetadata,
} from "@/components/identifier-detail";
import { identifierTypeConfigs } from "@/lib/directory";
import { formatIdentifier, getIdentifier, listIdentifiers } from "@/lib/data";

const config = identifierTypeConfigs.BSB;

/** Revalidate static detail pages daily (ISR). */
export const revalidate = 86400;

export async function generateStaticParams() {
  return listIdentifiers(config.type).map(({ identifier }) => ({
    code: formatIdentifier(identifier.type, identifier.value),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  return identifierDetailMetadata(locale, config, code);
}

export default async function BsbDetailPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const entry = getIdentifier(config.type, code);
  if (!entry) {
    notFound();
  }
  return <IdentifierDetail locale={locale} config={config} entry={entry} />;
}
