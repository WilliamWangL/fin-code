import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, LifeBuoy, Database } from "lucide-react";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { alternatesFor, siteConfig } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/contact"),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  const common = await getTranslations({ locale, namespace: "common" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title") },
  ];

  const channels = [
    {
      icon: Building2,
      title: t("salesTitle"),
      body: t("salesBody"),
      email: "sales@fincode.example.com",
    },
    {
      icon: LifeBuoy,
      title: t("supportTitle"),
      body: t("supportBody"),
      email: "support@fincode.example.com",
    },
    {
      icon: Database,
      title: t("dataTitle"),
      body: t("dataBody"),
      email: "data@fincode.example.com",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        breadcrumbs={breadcrumbs}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {channels.map((channel) => (
          <Card key={channel.title} className="flex flex-col">
            <CardHeader>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <channel.icon className="h-5 w-5" aria-hidden />
              </span>
              <CardTitle className="mt-3">{channel.title}</CardTitle>
              <CardDescription>{channel.body}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("email")}
              </p>
              <a
                href={`mailto:${channel.email}`}
                className="mt-1 block font-mono text-sm font-medium text-primary hover:underline"
              >
                {channel.email}
              </a>
            </CardContent>
          </Card>
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
          "@type": "ContactPage",
          name: t("title"),
          description: t("metaDescription"),
          inLanguage: locale,
          isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
        }}
      />
    </div>
  );
}
