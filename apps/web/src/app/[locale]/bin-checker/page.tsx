import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { alternatesFor, siteConfig } from "@/lib/site";
import { breadcrumbListJsonLd, faqPageJsonLd } from "@/lib/structured-data";

import { BinChecker } from "./bin-checker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tool" });
  // Localized title/description keep the /en and /zh copies from sharing an
  // identical <head>, and og:url pins the page to its own canonical so social
  // and search consumers see the same URL Google indexes.
  const alternates = alternatesFor(locale, "/bin-checker");
  const title = t("binMetaTitle");
  const description = t("binMetaDescription");
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "website",
      url: alternates.canonical,
      siteName: siteConfig.name,
      title,
      description,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
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
  const common = await getTranslations({ locale, namespace: "common" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("binCheckerTitle") },
  ];

  const faqItems = [
    { question: t("binFaq1Q"), answer: t("binFaq1A") },
    { question: t("binFaq2Q"), answer: t("binFaq2A") },
  ];

  // Terms mirror the API response keys so the page doubles as field reference.
  const binFields = [
    { term: "brand", description: t("binFieldBrand") },
    { term: "type", description: t("binFieldType") },
    { term: "issuer", description: t("binFieldIssuer") },
    { term: "country_iso2", description: t("binFieldCountry") },
    { term: "is_eu / is_eea / is_sepa", description: t("binFieldRegion") },
  ];

  const binSteps = [t("binHowStep1"), t("binHowStep2"), t("binHowStep3")];

  const relatedLinks = [
    { href: "/docs/bin", label: t("binRelatedDocs") },
    { href: "/developers", label: t("binRelatedDevelopers") },
    { href: "/iban-checker", label: t("binRelatedIban") },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("binCheckerTitle")}
        description={t("binCheckerSubtitle")}
        breadcrumbs={breadcrumbs}
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

      <section aria-labelledby="bin-fields" className="mt-16 max-w-3xl">
        <h2 id="bin-fields" className="text-2xl font-bold tracking-tight">
          {t("binFieldsTitle")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("binFieldsSubtitle")}</p>
        <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
          {binFields.map((field) => (
            <div
              key={field.term}
              className="grid gap-1 px-6 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4"
            >
              <dt className="font-mono text-sm text-foreground">{field.term}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">
                {field.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="bin-how" className="mt-16 max-w-3xl">
        <h2 id="bin-how" className="text-2xl font-bold tracking-tight">
          {t("binHowTitle")}
        </h2>
        <ol className="mt-6 space-y-3">
          {binSteps.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
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

      <section aria-labelledby="bin-related" className="mt-16 max-w-3xl">
        <h2 id="bin-related" className="text-2xl font-bold tracking-tight">
          {t("binRelatedTitle")}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {relatedLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm transition-colors hover:border-primary/50"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <JsonLd data={breadcrumbListJsonLd(breadcrumbs, locale)} />
      <JsonLd data={faqPageJsonLd(faqItems)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: t("binCheckerTitle"),
          description: t("binMetaDescription"),
          url: `${siteConfig.url}/${locale}/bin-checker`,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Any",
          inLanguage: locale,
          isAccessibleForFree: true,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
        }}
      />
    </div>
  );
}
