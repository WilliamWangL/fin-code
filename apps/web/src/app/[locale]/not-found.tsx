import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

import { cn } from "@/lib/utils";

const SUGGESTED_TOOLS = [
  { href: "/iban-checker", key: "ibanValidator" },
  { href: "/swift-codes", key: "swiftLookup" },
  { href: "/routing-numbers", key: "routingLookup" },
  { href: "/banks", key: "bankDirectory" },
] as const;

export default async function NotFound({
  params,
}: {
  params?: Promise<{ locale: string }>;
}) {
  const resolved = params ? await params : undefined;
  const locale = routing.locales.includes(resolved?.locale as never)
    ? (resolved?.locale as string)
    : routing.defaultLocale;
  if (resolved) setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "notFound" });
  const nav = await getTranslations({ locale, namespace: "nav" });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <p className="mb-4 font-mono text-sm text-muted-foreground">404</p>
      <PageHeader
        title={t("title")}
        description={t("description")}
        className="max-w-2xl"
      />
      <div className="mt-10 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("suggestions")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SUGGESTED_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-xl border border-border bg-card p-4 text-sm font-medium transition-colors hover:border-primary/50"
            >
              {nav(tool.key)}
            </Link>
          ))}
        </div>
      </div>
      <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "mt-10")}>
        {t("back")}
      </Link>
    </div>
  );
}
