import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookOpen, ChevronRight } from "lucide-react";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { DocsShell } from "@/components/docs-shell";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { docGroups } from "@/lib/docs";
import { alternatesFor, siteConfig } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "docs" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/docs"),
  };
}

export default async function DocsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "docs" });
  const common = await getTranslations({ locale, namespace: "common" });

  const groupLabels: Record<string, string> = {
    "getting-started": t("groupGettingStarted"),
    endpoints: t("groupEndpoints"),
    reference: t("groupReference"),
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title") },
  ];

  return (
    <DocsShell locale={locale}>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        breadcrumbs={breadcrumbs}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {t("editNotice")}
          </span>
        }
      />

      <div className="mt-10 space-y-10">
        {docGroups.map((group) => (
          <section key={group.key} aria-labelledby={`docs-${group.key}`}>
            <h2 id={`docs-${group.key}`} className="text-lg font-semibold tracking-tight">
              {groupLabels[group.key] ?? group.key}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {group.pages.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/docs/${page.slug}`}
                    className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                      {page.title}
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden
                      />
                    </span>
                    <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {page.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
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
    </DocsShell>
  );
}
