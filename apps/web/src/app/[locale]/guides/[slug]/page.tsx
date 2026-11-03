import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { guideBody, guideBySlug, guideSlugs, guides } from "@/lib/guides";
import { identifierTypeConfigs } from "@/lib/directory";
import { alternatesFor } from "@/lib/site";
import {
  articleJsonLd,
  breadcrumbListJsonLd,
  faqPageJsonLd,
} from "@/lib/structured-data";
import { cn } from "@/lib/utils";

export const revalidate = 86400;

export function generateStaticParams() {
  return guideSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return {};
  const body = guideBody(guide, locale);
  const t = await getTranslations({ locale, namespace: "guides" });
  return {
    title: body.title,
    description: body.description,
    alternates: alternatesFor(locale, `/guides/${guide.slug}`),
    openGraph: {
      title: t("metaTitlePage", { title: body.title }),
      description: body.description,
      type: "article",
      modifiedTime: guide.reviewed,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const guide = guideBySlug(slug);
  if (!guide) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "guides" });
  const common = await getTranslations({ locale, namespace: "common" });
  const body = guideBody(guide, locale);

  const family =
    guide.family && guide.family in identifierTypeConfigs
      ? identifierTypeConfigs[guide.family as keyof typeof identifierTypeConfigs]
      : undefined;
  const familyLabel = guide.family ? common(`identifierTypes.${guide.family}`) : undefined;

  const reviewed = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${guide.reviewed}T00:00:00Z`));

  const related = guides.filter((candidate) => candidate.slug !== guide.slug).slice(0, 3);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title"), href: "/guides" },
    { label: body.title },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={body.title}
        description={body.description}
        breadcrumbs={breadcrumbs}
        badge={guide.featured ? <Badge variant="success">{t("startHere")}</Badge> : undefined}
      />

      <div className="mt-10 gap-10 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* ── Table of contents ─────────────────────────────────────────── */}
        <nav aria-label={t("onThisPage")} className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("onThisPage")}
            </p>
            <ol className="space-y-1.5 text-sm">
              {body.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
            <p className="pt-2 text-xs text-muted-foreground">
              {t("lastReviewed", { date: reviewed })}
            </p>
          </div>
        </nav>

        <article className="min-w-0">
          <div className="max-w-3xl space-y-4">
            {body.intro.map((paragraph) => (
              <p key={paragraph} className="text-base leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>

          {body.sections.map((section) => (
            <section key={section.id} id={section.id} className="mt-10 scroll-mt-24">
              <h2 className="text-xl font-semibold tracking-tight">{section.heading}</h2>
              <div className="mt-3 max-w-3xl space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>

              {section.bullets && (
                <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              {section.table && (
                <div className="mt-4 max-w-3xl">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {section.table.headers.map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.table.rows.map((row) => (
                        <TableRow key={row.join("|")}>
                          {row.map((cell, index) => (
                            <TableCell
                              key={`${row[0]}-${index}`}
                              className={
                                index === 0
                                  ? "font-mono text-sm font-medium"
                                  : "text-sm text-muted-foreground"
                              }
                            >
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          ))}

          {/* ── Hand-off to the lookup tool ─────────────────────────────── */}
          {family && familyLabel && (
            <div className="mt-10 rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-medium">
                {t("openDirectory", { family: familyLabel })}
              </p>
              <Link
                href={family.basePath}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
              >
                {familyLabel} →
              </Link>
            </div>
          )}

          {/* ── FAQ ─────────────────────────────────────────────────────── */}
          {body.faq.length > 0 && (
            <section aria-labelledby="guide-faq" className="mt-12">
              <h2 id="guide-faq" className="text-xl font-semibold tracking-tight">
                {t("faqTitle")}
              </h2>
              <div className="mt-4 max-w-3xl divide-y divide-border rounded-xl border border-border bg-card">
                {body.faq.map((item) => (
                  <details
                    key={item.question}
                    className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium">
                      {item.question}
                      <span
                        className="text-muted-foreground transition-transform group-open:rotate-90"
                        aria-hidden
                      >
                        ›
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* ── More guides ─────────────────────────────────────────────── */}
          <section aria-labelledby="more-guides" className="mt-12">
            <h2 id="more-guides" className="text-xl font-semibold tracking-tight">
              {t("moreGuides")}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((candidate) => {
                const relatedBody = guideBody(candidate, locale);
                return (
                  <li key={candidate.slug}>
                    <Link
                      href={`/guides/${candidate.slug}`}
                      className="block h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                    >
                      <span className="text-sm font-medium">{relatedBody.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {relatedBody.description}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </article>
      </div>

      <JsonLd data={breadcrumbListJsonLd(breadcrumbs, locale)} />
      <JsonLd
        data={articleJsonLd({
          headline: body.title,
          description: body.description,
          locale,
          path: `/guides/${guide.slug}`,
          dateModified: guide.reviewed,
        })}
      />
      <JsonLd data={faqPageJsonLd(body.faq)} />
    </div>
  );
}
