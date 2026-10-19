"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Inline copy affordance for identifier values inside server-rendered
 * tables (detail pages keep their tables static for SEO).
 */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions / insecure origin) — ignore.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? t("copied") : t("copy")}
      title={copied ? t("copied") : t("copy")}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
