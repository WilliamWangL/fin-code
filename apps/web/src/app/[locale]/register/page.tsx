import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RegisterForm } from "@/components/portal/register-form";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal" });
  return {
    title: t("registerMetaTitle"),
    description: t("registerSubtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "portal" });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6 sm:py-24">
      <div className="space-y-2 pb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("registerTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("registerSubtitle")}</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
