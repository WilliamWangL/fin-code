import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { pagePath, pageWindow } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const ITEM =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm transition-colors";
const IDLE = "border-border bg-card hover:border-primary/50";
const ACTIVE = "border-primary bg-primary/5 font-medium text-primary";

/**
 * Server-rendered pagination. Every page is a real <a href>, so crawlers can
 * walk the full listing instead of stopping at whatever fits in one document.
 */
export async function PaginationNav({
  locale,
  basePath,
  page,
  totalPages,
  label,
}: {
  locale: string;
  /** Locale-independent listing path, e.g. "/countries/CN". */
  basePath: string;
  page: number;
  totalPages: number;
  /** Accessible name for the <nav> element. */
  label: string;
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations({ locale, namespace: "common" });
  const previous = page > 1 ? pagePath(basePath, page - 1) : null;
  const next = page < totalPages ? pagePath(basePath, page + 1) : null;

  return (
    <nav aria-label={label} className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {t("pageOf", { page, total: totalPages })}
      </p>
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          {previous ? (
            <Link
              href={previous}
              rel="prev"
              aria-label={t("previousPage")}
              className={cn(ITEM, IDLE)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className={cn(ITEM, "border-border/60 text-muted-foreground/50")}>
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
        </li>
        {pageWindow(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 text-sm text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={pagePath(basePath, item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(ITEM, item === page ? ACTIVE : IDLE)}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        <li>
          {next ? (
            <Link href={next} rel="next" aria-label={t("nextPage")} className={cn(ITEM, IDLE)}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className={cn(ITEM, "border-border/60 text-muted-foreground/50")}>
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
