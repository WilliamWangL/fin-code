"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";

export interface CodeTab {
  label: string;
  code: string;
}

/**
 * Language switcher for documentation snippets. A single snippet renders as a
 * plain code block; multiple snippets render as tabs so the same example can be
 * read in every supported language without scrolling past the others.
 */
export function CodeTabs({ blocks }: { blocks: CodeTab[] }) {
  const t = useTranslations("common");
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  if (blocks.length === 1) {
    const only = blocks[0];
    return <CodeBlock code={only.code} language={only.label} />;
  }

  const current = blocks[Math.min(active, blocks.length - 1)];

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions) — ignore.
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/60">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <div role="tablist" aria-label={t("codeLanguage")} className="flex flex-wrap gap-1">
          {blocks.map((block, index) => (
            <button
              key={block.label}
              type="button"
              role="tab"
              aria-selected={index === active}
              onClick={() => setActive(index)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                index === active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {block.label}
            </button>
          ))}
        </div>
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
      <div role="tabpanel">
        <CodeBlock
          code={current.code}
          className="rounded-none border-0 bg-transparent"
          showHeader={false}
        />
      </div>
    </div>
  );
}
