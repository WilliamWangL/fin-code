import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import {
  IdentifierDetail,
  identifierDetailMetadata,
} from "@/components/identifier-detail";
import { identifierTypeConfigs } from "@/lib/directory";
import { formatIdentifier, getIdentifier, listIdentifiers } from "@/lib/data";

const config = identifierTypeConfigs.ABA_ROUTING;

/** Revalidate static detail pages daily (ISR). */
export const revalidate = 86400;

export async function generateStaticParams() {
  return listIdentifiers(config.type).map(({ identifier }) => ({
    number: formatIdentifier(identifier.type, identifier.value),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; number: string }>;
}): Promise<Metadata> {
  const { locale, number } = await params;
  return identifierDetailMetadata(locale, config, number);
}

export default async function RoutingNumbersDetailPage({
  params,
}: {
  params: Promise<{ locale: string; number: string }>;
}) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const entry = getIdentifier(config.type, number);
  if (!entry) {
    notFound();
  }
  return <IdentifierDetail locale={locale} config={config} entry={entry} />;
}
