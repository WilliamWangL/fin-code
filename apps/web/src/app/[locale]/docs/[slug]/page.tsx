import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { CodeBlock } from "@/components/code-block";
import { DocsShell } from "@/components/docs-shell";
import { JsonLd } from "@/components/json-ld";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { docBySlug, docPages } from "@/lib/docs";
import { alternatesFor, siteConfig } from "@/lib/site";

export const revalidate = 86400;

export function generateStaticParams() {
  return docPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = docBySlug[slug];
  if (!page) return {};
  const t = await getTranslations({ locale, namespace: "docs" });
  return {
    title: t("metaTitlePage", { title: page.title }),
    description: page.description,
    alternates: alternatesFor(locale, `/docs/${page.slug}`),
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = docBySlug[slug];
  if (!page) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "docs" });
  const common = await getTranslations({ locale, namespace: "common" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title"), href: "/docs" },
    { label: page.title },
  ];

  return (
    <DocsShell locale={locale} activeSlug={page.slug}>
      <nav aria-label="Breadcrumb">
        <Breadcrumb items={breadcrumbs} />
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-muted-foreground text-pretty">
          {page.description}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">{t("editNotice")}</p>
      </header>

      {/* On this page */}
      {page.sections.length > 1 && (
        <nav aria-label={t("onThisPage")} className="mt-8 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("onThisPage")}
          </p>
          <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {page.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-sm text-primary hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-10 space-y-10">
        {page.sections.map((section) => (
          <section key={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-24">
            <h2 id={`${section.id}-heading`} className="text-xl font-semibold tracking-tight">
              {section.title}
            </h2>
            {section.body && (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </p>
            )}
            {section.code && (
              <div className="mt-4 space-y-4">
                {section.code.map((block, index) => (
                  <CodeBlock
                    key={`${section.id}-code-${index}`}
                    code={block.code}
                    language={block.label ?? block.language}
                  />
                ))}
              </div>
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
                    {section.table.rows.map((row, rowIndex) => (
                      <TableRow key={`${section.id}-row-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <TableCell
                            key={`${section.id}-${rowIndex}-${cellIndex}`}
                            className={
                              cellIndex === 0 ? "font-mono text-xs font-medium" : "text-sm"
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
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.label,
            ...(crumb.href
              ? { item: `${siteConfig.url}/${locale}${crumb.href === "/" ? "" : crumb.href}` }
              : {}),
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: page.title,
          description: page.description,
          inLanguage: locale,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
        }}
      />
    </DocsShell>
  );
}
