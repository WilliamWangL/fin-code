import type { Metadata } from "next";
import {
  Banknote,
  Building2,
  ChevronRight,
  Code2,
  CreditCard,
  Hash,
  Landmark,
  MapPin,
  Network,
  Search,
  ShieldCheck,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { JsonLd } from "@/components/json-ld";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { countryByIso2, datasetStats, institutions } from "@/lib/data";
import { alternatesFor, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const POPULAR_SEARCHES = ["ICBKCNBJ", "DE89370400440532013000", "021000021", "062001"];

const TOOLS = [
  { href: "/iban-checker", icon: Banknote, key: "ibanValidator" },
  { href: "/swift-codes", icon: Network, key: "swiftLookup" },
  { href: "/routing-numbers", icon: Hash, key: "routingLookup" },
  { href: "/sort-codes", icon: Hash, key: "sortCodeLookup" },
  { href: "/bsb", icon: MapPin, key: "bsbLookup" },
  { href: "/ifsc", icon: Landmark, key: "ifscLookup" },
  { href: "/cnaps", icon: CreditCard, key: "cnapsLookup" },
  { href: "/banks", icon: Building2, key: "bankDirectory" },
] as const;

const IDENTIFIERS = [
  { name: "IBAN", example: "DE89 3704 0044...", href: "/iban/DE", region: "EU + 80 countries" },
  { name: "SWIFT/BIC", example: "ICBKCNBJ", href: "/swift-codes", region: "Global" },
  { name: "Routing Number", example: "021000021", href: "/routing-numbers", region: "United States" },
  { name: "Sort Code", example: "20-00-00", href: "/sort-codes", region: "United Kingdom" },
  { name: "BSB", example: "062-001", href: "/bsb", region: "Australia" },
  { name: "IFSC", example: "HDFC0000001", href: "/ifsc", region: "India" },
  { name: "CNAPS", example: "102100099996", href: "/cnaps", region: "China" },
  { name: "Bank Directory", example: "40+ institutions", href: "/banks", region: "Worldwide" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/"),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const stats = datasetStats();
  const featuredBanks = institutions.slice(0, 6);

  const faqItems = [1, 2, 3, 4, 5, 6].map((index) => ({
    question: t(`home.faq${index}Q`),
    answer: t(`home.faq${index}A`),
  }));

  const quickstartCode = `curl "https://api.fincode.example.com/v1/iban/validate?iban=DE89370400440532013000" \\
  -H "Authorization: Bearer sk_test_..."`;

  const responseCode = `{
  "data": {
    "valid": true,
    "country": "DE",
    "bank_code": "37040044",
    "account_number": "0532013000"
  },
  "meta": {
    "request_id": "req_8f14e45fceea167a"
  }
}`;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {t("home.heroBadge")}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t("home.heroTitle")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground text-pretty">
              {t("home.heroSubtitle")}
            </p>
            <div className="mx-auto mt-8 max-w-2xl">
              <SearchBox size="lg" autoFocus={false} />
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>{t("common.popularSearches")}:</span>
                {POPULAR_SEARCHES.map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="rounded-full border border-border bg-card px-2.5 py-1 font-mono transition-colors hover:border-primary hover:text-primary"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
                {t("home.heroPrimary")}
              </Link>
              <Link
                href="/docs"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                {t("home.heroSecondary")}
              </Link>
            </div>
          </div>

          {/* Stats (real counts from the preview dataset) */}
          <dl className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: stats.identifiers, label: t("home.statsIdentifiers") },
              { value: stats.institutions, label: t("home.statsBanks") },
              { value: stats.countries, label: t("home.statsCountries") },
              { value: stats.ibanCountries, label: t("home.statsIbanCountries") },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-4 text-center"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-bold">{stat.value}</dd>
                <dd className="mt-1 text-xs text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Popular tools ────────────────────────────────────────────────── */}
      <section aria-labelledby="tools-title" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="tools-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("home.toolsTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("home.toolsSubtitle")}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                <CardHeader>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <tool.icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <CardTitle className="mt-2">{nav(tool.key)}</CardTitle>
                  <CardDescription>{nav(`${tool.key}Desc`)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t("common.openTool")}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Supported identifiers ────────────────────────────────────────── */}
      <section aria-labelledby="identifiers-title" className="border-y border-border bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 id="identifiers-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("home.identifiersTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("home.identifiersSubtitle")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IDENTIFIERS.map((identifier) => (
              <Link
                key={identifier.name}
                href={identifier.href}
                className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <p className="text-sm font-semibold">{identifier.name}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{identifier.example}</p>
                <p className="mt-3 text-xs text-muted-foreground">{identifier.region}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {t("common.learnMore")} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bank directory preview ───────────────────────────────────────── */}
      <section aria-labelledby="directory-title" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="directory-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("home.directoryTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("home.directorySubtitle")}</p>
          </div>
          <Link href="/banks" className={cn(buttonVariants({ variant: "outline" }))}>
            {t("common.viewAll")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredBanks.map((bank) => {
            const country = countryByIso2[bank.country];
            return (
              <Link key={bank.slug} href={`/banks/${bank.slug}`} className="group">
                <Card className="h-full transition-all group-hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>{bank.shortName}</CardTitle>
                      <Badge variant="outline">{bank.country}</Badge>
                    </div>
                    <CardDescription className="line-clamp-1">{bank.nameEn}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {country?.nameEn} · {bank.identifiers.length}{" "}
                      {t("banks.identifiersCount", { count: bank.identifiers.length }).toLowerCase()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── API introduction ─────────────────────────────────────────────── */}
      <section aria-labelledby="api-title" className="border-y border-border bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 id="api-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t("home.apiTitle")}
              </h2>
              <p className="mt-2 text-muted-foreground">{t("home.apiSubtitle")}</p>
              <ul className="mt-6 space-y-4">
                {[
                  { icon: Code2, title: t("home.apiFeature1Title"), body: t("home.apiFeature1Body") },
                  { icon: ShieldCheck, title: t("home.apiFeature2Title"), body: t("home.apiFeature2Body") },
                  { icon: Search, title: t("home.apiFeature3Title"), body: t("home.apiFeature3Body") },
                ].map((feature) => (
                  <li key={feature.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{feature.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/docs" className={cn(buttonVariants(), "mt-8")}>
                {t("developers.readDocs")}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("common.apiEndpoint")}
                </div>
                <pre className="overflow-x-auto p-4 text-xs leading-relaxed font-mono">
                  <code>{quickstartCode}</code>
                </pre>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  200 OK
                </div>
                <pre className="overflow-x-auto p-4 text-xs leading-relaxed font-mono">
                  <code>{responseCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Developer CTA ────────────────────────────────────────────────── */}
      <section aria-labelledby="dev-cta-title" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, white 0, transparent 45%), radial-gradient(circle at 80% 20%, white 0, transparent 40%)",
            }}
          />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 id="dev-cta-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t("home.devCtaTitle")}
              </h2>
              <p className="mt-2 max-w-2xl opacity-90">{t("home.devCtaSubtitle")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "lg" }), "bg-white text-primary-foreground hover:opacity-90")}
              >
                {t("home.devCtaPrimary")}
              </Link>
              <Link
                href="/docs/quickstart"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/40 bg-transparent text-white hover:bg-white/10",
                )}
              >
                {t("home.devCtaSecondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing preview ──────────────────────────────────────────────── */}
      <section aria-labelledby="pricing-title" className="border-y border-border bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 id="pricing-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("home.pricingTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("home.pricingSubtitle")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {(["free", "developer", "startup"] as const).map((plan) => (
              <Card key={plan} className="h-full">
                <CardHeader>
                  <CardTitle>{t(`pricing.${plan}.name`)}</CardTitle>
                  <CardDescription>{t(`pricing.${plan}.description`)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {t(`pricing.${plan}.price`)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {t("pricing.perMonth")}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {plan === "free" && "500"}
                    {plan === "developer" && "20,000"}
                    {plan === "startup" && "100,000"}{" "}
                    {t("pricing.requests").toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Link href="/pricing" className={cn(buttonVariants({ variant: "outline" }), "mt-8")}>
            {t("common.viewAll")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby="faq-title" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 id="faq-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("home.faqTitle")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("home.faqSubtitle")}</p>
        <div className="mt-8 divide-y divide-border rounded-xl border border-border bg-card">
          {faqItems.map((item) => (
            <details key={item.question} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium">
                {item.question}
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                  aria-hidden
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Structured data: WebSite + FAQPage */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: siteConfig.url,
          description: t("home.metaDescription"),
          inLanguage: locale,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${siteConfig.url}/${locale}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />
    </>
  );
}
