import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  IdentifierDetail,
  identifierDetailMetadata,
} from "@/components/identifier-detail";
import { identifierTypeConfigs } from "@/lib/directory";
import {
  countryByIso2,
  formatIdentifier,
  getIdentifier,
  listIdentifiers,
  type IdentifierEntry,
  type Institution,
} from "@/lib/data";
import { institutionForLiveBank } from "@/lib/data/directory";
import { fetchIfsc, type ApiIfscData } from "@/lib/directory-api";
import { normalizeIdentifier } from "@/lib/identifiers";
import { alternatesFor } from "@/lib/site";

const config = identifierTypeConfigs.IFSC;

/** Revalidate static detail pages daily (ISR). */
export const revalidate = 86400;

export async function generateStaticParams() {
  return listIdentifiers(config.type).map(({ identifier }) => ({
    code: formatIdentifier(identifier.type, identifier.value),
  }));
}

/**
 * Renderer entry for a live API record. The API returns the bank name and
 * country only, so the directory record (slug, short name) is resolved by
 * normalised name; the fallback keeps the page renderable when the export and
 * the database disagree. MICR is forwarded as-is (the API omits it when the
 * source row has none).
 */
function liveEntry(data: ApiIfscData): IdentifierEntry {
  const institution: Institution =
    institutionForLiveBank(data.bank.name_en, data.bank.country) ?? {
      slug: `live-${data.bank.id}`,
      legalName: data.bank.name_en,
      nameEn: data.bank.name_en,
      nameLocal: data.bank.name_local ?? undefined,
      shortName: data.bank.short_name ?? data.bank.name_en,
      country: data.bank.country,
      institutionType: "BANK",
      website: "",
      identifiers: [],
      branches: [],
    };
  return {
    identifier: {
      type: "IFSC",
      value: data.ifsc,
      city: data.city ?? undefined,
      label: data.branch ?? undefined,
      micr: data.micr ?? undefined,
      sourceId: data.source?.name ?? "live",
      verified: data.status === "ACTIVE",
    },
    institution,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  if (getIdentifier(config.type, code)) {
    return identifierDetailMetadata(locale, config, code);
  }

  const live = await fetchIfsc(normalizeIdentifier(config.type, code));
  if (!live) {
    return identifierDetailMetadata(locale, config, code);
  }
  const tool = await getTranslations({ locale, namespace: `tool.${config.messageNamespace}` });
  const display = formatIdentifier(config.type, live.ifsc);
  const country = countryByIso2[live.bank.country];
  return {
    title: tool("metaTitleDetail", { code: display, bank: live.bank.name_en }),
    description: tool("metaDescriptionDetail", {
      code: display,
      bank: live.bank.name_en,
      country: country?.nameEn ?? live.bank.country,
    }),
    alternates: alternatesFor(locale, `${config.basePath}/${display}`),
  };
}

export default async function IfscDetailPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  // Static dataset first (curated sample pages); every other IFSC is looked up
  // live against /v1/ifsc and ISR-cached for a day.
  let entry = getIdentifier(config.type, code);
  if (!entry) {
    const live = await fetchIfsc(normalizeIdentifier(config.type, code));
    entry = live ? liveEntry(live) : undefined;
  }
  if (!entry) {
    notFound();
  }
  return <IdentifierDetail locale={locale} config={config} entry={entry} />;
}
