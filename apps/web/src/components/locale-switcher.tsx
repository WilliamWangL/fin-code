"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5"
      role="group"
      aria-label={t("language")}
    >
      <Languages className="mx-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => router.replace(pathname, { locale: code })}
          aria-current={locale === code}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors",
            locale === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
