"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { logout } from "@/lib/portal/api";
import { getAccessToken, useSession } from "@/lib/portal/session";
import { cn } from "@/lib/utils";

/**
 * Client shell for the portal dashboard (FIN-017): keeps anonymous visitors
 * out (the JWT lives in localStorage, so the guard is client-side), renders
 * the section navigation and offers sign-out.
 */

const TABS = [
  { href: "/dashboard", key: "navOverview" },
  { href: "/dashboard/api-keys", key: "navApiKeys" },
  { href: "/dashboard/usage", key: "navUsage" },
  { href: "/dashboard/billing", key: "navBilling" },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const t = useTranslations("portal");
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSession();
  const [ready, setReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      setReady(true);
    } else {
      // Keep query strings (e.g. /dashboard/billing?plan=startup) so the
      // preselected plan survives the login round-trip.
      router.replace(`/login?next=${encodeURIComponent(`${pathname}${window.location.search}`)}`);
    }
  }, [router, pathname]);

  async function onSignOut(): Promise<void> {
    setSigningOut(true);
    await logout();
    router.push("/");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-24 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <aside className="shrink-0 lg:w-64">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("signedInAs")}
            </p>
            <p className="mt-1 truncate text-sm font-medium">{user?.email ?? ""}</p>
            <nav aria-label={t("dashboard")} className="mt-4 space-y-1">
              {TABS.map((tab) => {
                const active =
                  tab.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {t(tab.key)}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onSignOut}
                disabled={signingOut}
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                {t("signOut")}
              </Button>
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
