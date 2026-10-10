import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { alternatesFor } from "@/lib/site";

import { BinChecker } from "./bin-checker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Card BIN Checker — Look Up Card Brand & Issuing Bank",
    description:
      "Free card BIN checker: look up any BIN (the first 6 to 8 digits of a card number) to identify the card brand, funding type and issuing bank.",
    alternates: alternatesFor(locale, "/bin-checker"),
  };
}

export default async function BinCheckerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tool" });

  const faqItems = [
    { question: t("binFaq1Q"), answer: t("binFaq1A") },
    { question: t("binFaq2Q"), answer: t("binFaq2A") },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("binCheckerTitle")}
        description={t("binCheckerSubtitle")}
        breadcrumbs={[{ label: t("binCheckerTitle") }]}
      />

      <div className="mt-8 max-w-3xl">
        <BinChecker />
      </div>

      <section aria-labelledby="bin-what" className="mt-16 max-w-3xl">
        <h2 id="bin-what" className="text-2xl font-bold tracking-tight">
          {t("binWhatTitle")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("binWhatBody")}</p>
      </section>

      <section aria-labelledby="bin-faq" className="mt-16 max-w-3xl">
        <h2 id="bin-faq" className="text-2xl font-bold tracking-tight">
          {t("binFaqTitle")}
        </h2>
        <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium">
                {item.question}
                <span className="text-muted-foreground transition-transform group-open:rotate-90">
                  ›
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
