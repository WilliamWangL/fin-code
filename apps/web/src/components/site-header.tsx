"use client";

import { ChevronDown, Landmark, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/portal/session";
import { cn } from "@/lib/utils";

interface NavChild {
  label: string;
  href: string;
}

interface NavGroup {
  key: string;
  label: string;
  children: NavChild[];
}

function buildNavGroups(nav: ReturnType<typeof useTranslations>): NavGroup[] {
  return [
    {
      key: "products",
      label: nav("products"),
      children: [
        { label: nav("ibanValidator"), href: "/iban-checker" },
        { label: nav("swiftLookup"), href: "/swift-codes" },
        { label: nav("routingLookup"), href: "/routing-numbers" },
        { label: nav("sortCodeLookup"), href: "/sort-codes" },
        { label: nav("bsbLookup"), href: "/bsb" },
        { label: nav("ifscLookup"), href: "/ifsc" },
        { label: nav("cnapsLookup"), href: "/cnaps" },
        { label: nav("bankDirectory"), href: "/banks" },
      ],
    },
    {
      key: "developers",
      label: nav("developers"),
      children: [
        { label: nav("api"), href: "/developers" },
        { label: nav("documentation"), href: "/docs" },
        { label: nav("apiReference"), href: "/docs/api-reference" },
        { label: nav("sdks"), href: "/docs/sdks" },
        { label: nav("changelog"), href: "/docs/changelog" },
        { label: nav("status"), href: "/status" },
      ],
    },
    {
      key: "resources",
      label: nav("resources"),
      children: [
        { label: nav("bankDirectory"), href: "/banks" },
        { label: nav("countryDirectory"), href: "/countries" },
        { label: nav("pricing"), href: "/pricing" },
      ],
    },
  ];
}

export function SiteHeader() {
  const t = useTranslations("common");
  const nav = useTranslations("nav");
  const groups = buildNavGroups(nav);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status } = useSession();
  const authenticated = status === "authenticated";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold" aria-label="FinCode">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-lg tracking-tight">{t("siteName")}</span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {groups.map((group) => (
            <div key={group.key} className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                aria-haspopup="true"
              >
                {group.label}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </button>
              <div className="invisible absolute left-0 top-full z-50 w-60 translate-y-1 rounded-xl border border-border bg-card p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                {group.children.map((child) => (
                  <Link
                    key={`${group.key}-${child.href}`}
                    href={child.href}
                    className="block rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            {nav("pricing")}
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
          <ThemeToggle />
          <Link
            href={authenticated ? "/dashboard" : "/login"}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden lg:inline-flex")}
          >
            {authenticated ? t("dashboard") : t("signIn")}
          </Link>
          <Link
            href={authenticated ? "/dashboard/api-keys" : "/register"}
            className={cn(buttonVariants({ size: "sm" }), "hidden lg:inline-flex")}
          >
            {t("getApiKey")}
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-muted lg:hidden"
            aria-label={mobileOpen ? t("close") : t("menu")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileOpen && (
        <nav aria-label="Mobile" className="border-t border-border bg-card lg:hidden">
          <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
            {groups.map((group) => (
              <div key={group.key}>
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.children.map((child) => (
                  <Link
                    key={`${group.key}-m-${child.href}`}
                    href={child.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-muted"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <LocaleSwitcher />
              <div className="flex items-center gap-2">
                <Link
                  href={authenticated ? "/dashboard" : "/login"}
                  onClick={() => setMobileOpen(false)}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  {authenticated ? t("dashboard") : t("signIn")}
                </Link>
                <Link
                  href={authenticated ? "/dashboard/api-keys" : "/register"}
                  onClick={() => setMobileOpen(false)}
                  className={buttonVariants({ size: "sm" })}
                >
                  {t("getApiKey")}
                </Link>
              </div>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
