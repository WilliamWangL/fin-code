import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Minus } from "lucide-react";

import type { BreadcrumbItem } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { alternatesFor, siteConfig } from "@/lib/site";

interface Plan {
  key: "free" | "developer" | "startup" | "business" | "enterprise";
  requests: string;
  rateLimit: string;
  apiAccess: boolean;
  bankDirectory: boolean;
  branchData: boolean;
  support: string;
  sla: string;
  popular?: boolean;
  href: string;
}

const PLANS: Plan[] = [
  {
    key: "free",
    requests: "500",
    rateLimit: "5 req/s",
    apiAccess: true,
    bankDirectory: true,
    branchData: false,
    support: "Community",
    sla: "—",
    href: "/register",
  },
  {
    key: "developer",
    requests: "20,000",
    rateLimit: "10 req/s",
    apiAccess: true,
    bankDirectory: true,
    branchData: false,
    support: "Email",
    sla: "—",
    href: "/dashboard/billing?plan=developer",
  },
  {
    key: "startup",
    requests: "100,000",
    rateLimit: "25 req/s",
    apiAccess: true,
    bankDirectory: true,
    branchData: true,
    support: "Email",
    sla: "—",
    popular: true,
    href: "/dashboard/billing?plan=startup",
  },
  {
    key: "business",
    requests: "500,000",
    rateLimit: "50 req/s",
    apiAccess: true,
    bankDirectory: true,
    branchData: true,
    support: "Priority",
    sla: "99.9%",
    href: "/dashboard/billing?plan=business",
  },
  {
    key: "enterprise",
    requests: "Custom",
    rateLimit: "Custom",
    apiAccess: true,
    bankDirectory: true,
    branchData: true,
    support: "Dedicated",
    sla: "Custom",
    href: "/contact",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/pricing"),
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "pricing" });
  const common = await getTranslations({ locale, namespace: "common" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: common("breadcrumbHome"), href: "/" },
    { label: t("title") },
  ];

  const featureRows: {
    label: string;
    value: (plan: Plan) => React.ReactNode;
  }[] = [
    { label: t("requests"), value: (plan) => plan.requests },
    { label: t("rateLimit"), value: (plan) => plan.rateLimit },
    {
      label: t("apiAccess"),
      value: (plan) => (plan.apiAccess ? <Check className="h-4 w-4 text-primary" aria-hidden /> : <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />),
    },
    {
      label: t("bankDirectory"),
      value: (plan) => (plan.bankDirectory ? <Check className="h-4 w-4 text-primary" aria-hidden /> : <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />),
    },
    {
      label: t("branchData"),
      value: (plan) => (plan.branchData ? <Check className="h-4 w-4 text-primary" aria-hidden /> : <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />),
    },
    { label: t("support"), value: (plan) => plan.support },
    { label: t("sla"), value: (plan) => plan.sla },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        breadcrumbs={breadcrumbs}
      />

      {/* ── Plan cards ────────────────────────────────────────────────── */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {PLANS.map((plan) => (
          <Card
            key={plan.key}
            className={cn(
              "relative flex flex-col",
              plan.popular && "border-primary shadow-lg shadow-primary/10",
            )}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                {t("mostPopular")}
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{t(`${plan.key}.name`)}</CardTitle>
              <CardDescription>{t(`${plan.key}.description`)}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-3xl font-bold tracking-tight">
                {t(`${plan.key}.price`)}
                {plan.key !== "enterprise" && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("perMonth")}
                  </span>
                )}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  {plan.requests} · {t("requests")}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  {plan.rateLimit} · {t("rateLimit")}
                </li>
                <li className="flex items-center gap-2">
                  {plan.branchData ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  {t("branchData")}
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({ variant: plan.popular ? "default" : "outline" }),
                  "w-full",
                )}
              >
                {plan.key === "enterprise" ? t("contactSales") : t("choose", { plan: t(`${plan.key}.name`) })}
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* ── Comparison table ──────────────────────────────────────────── */}
      <section aria-labelledby="compare-plans" className="mt-16">
        <h2 id="compare-plans" className="text-xl font-semibold tracking-tight">
          {t("compareTitle")}
        </h2>
        <div className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-40">{t("included")}</TableHead>
                {PLANS.map((plan) => (
                  <TableHead key={plan.key} className="text-center">
                    {t(`${plan.key}.name`)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="text-sm font-medium">{row.label}</TableCell>
                  {PLANS.map((plan) => (
                    <TableCell key={`${plan.key}-${row.label}`} className="text-center text-sm">
                      {row.value(plan)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

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
    </div>
  );
}
