import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { docGroups } from "@/lib/docs";
import { cn } from "@/lib/utils";

/**
 * Docs layout shell: navigation sidebar with grouped pages and the content
 * area. The sidebar is hidden on small screens where the docs index serves
 * as the entry point.
 */
export async function DocsShell({
  locale,
  activeSlug,
  children,
}: {
  locale: string;
  activeSlug?: string;
  children: ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "docs" });
  const groupLabels: Record<string, string> = {
    "getting-started": t("groupGettingStarted"),
    endpoints: t("groupEndpoints"),
    reference: t("groupReference"),
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="gap-10 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="Documentation" className="sticky top-24 space-y-6">
            {docGroups.map((group) => (
              <div key={group.key}>
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {groupLabels[group.key] ?? group.key}
                </p>
                <ul className="mt-2 space-y-1">
                  {group.pages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        href={`/docs/${page.slug}`}
                        aria-current={activeSlug === page.slug ? "page" : undefined}
                        className={cn(
                          "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                          activeSlug === page.slug
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
