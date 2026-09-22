"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Suggestion {
  kind: string;
  title: string;
  subtitle?: string;
  href: string;
}

export function SearchBox({
  size = "default",
  autoFocus = false,
  className,
}: {
  size?: "default" | "lg";
  autoFocus?: boolean;
  className?: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced suggestions from the universal search API (spec §11).
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=6`,
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { results: Suggestion[] };
        setSuggestions(payload.results ?? []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        // Network failure: fall back to full search page on submit.
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function submit(index: number) {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (index >= 0 && suggestions[index]) {
      router.push(suggestions[index].href);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(activeIndex);
        }}
      >
        <label className="sr-only" htmlFor="universal-search">
          {t("search")}
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="universal-search"
            type="search"
            autoComplete="off"
            autoFocus={autoFocus}
            value={query}
            placeholder={t("searchPlaceholder")}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="search-suggestions"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) =>
                  Math.min(current + 1, suggestions.length - 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, -1));
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            className={cn(
              "pl-10",
              size === "lg" && "h-12 pl-12 text-base",
            )}
          />
          {size === "lg" && (
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          )}
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.href}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => submit(index)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm",
                  index === activeIndex ? "bg-muted" : "bg-transparent",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{suggestion.title}</span>
                  {suggestion.subtitle && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {suggestion.subtitle}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs uppercase text-muted-foreground">
                  {suggestion.kind}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
