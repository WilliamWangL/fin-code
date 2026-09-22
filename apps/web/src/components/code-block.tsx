"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  language,
  className,
  showHeader = true,
}: {
  code: string;
  language?: string;
  className?: string;
  showHeader?: boolean;
}) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions) — ignore.
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-muted/60",
        className,
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {language ?? "text"}
          </span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label={copied ? t("copied") : t("copy")}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                {t("copied")}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {t("copy")}
              </>
            )}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
