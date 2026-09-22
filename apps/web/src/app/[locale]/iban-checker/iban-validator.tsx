"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CheckItem } from "@/components/check-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validateIban } from "@/lib/iban";

export function IbanValidator() {
  const t = useTranslations("tool");
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Support /iban-checker?iban=... deep links without making the page dynamic.
  useEffect(() => {
    if (initialized) return;
    const param = new URLSearchParams(window.location.search).get("iban");
    if (param) {
      setValue(param);
      setSubmitted(param);
    }
    setInitialized(true);
  }, [initialized]);

  const result = submitted !== null ? validateIban(submitted) : null;

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(value);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="flex-1">
          <label htmlFor="iban-input" className="sr-only">
            {t("enterIban")}
          </label>
          <Input
            id="iban-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("ibanPlaceholder")}
            className="h-12 font-mono text-base"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            aria-describedby="iban-disclaimer"
          />
        </div>
        <Button type="submit" size="lg" className="h-12">
          {t("validate")}
        </Button>
        {submitted !== null && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12"
            onClick={() => {
              setValue("");
              setSubmitted(null);
            }}
          >
            {t("clear")}
          </Button>
        )}
      </form>

      {result && (
        <div
          className={cn(
            "rounded-xl border p-6",
            result.valid ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5",
          )}
        >
          <div className="flex items-center gap-2">
            {result.valid ? (
              <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" aria-hidden />
            )}
            <p className="text-lg font-semibold">
              {result.valid ? t("validIban") : t("invalidIban")}
            </p>
            {result.parsed?.countryCode && (
              <Badge variant="secondary" className="font-mono">
                {result.parsed.countryCode}
              </Badge>
            )}
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("checksPerformed")}
              </h3>
              <ul className="mt-2 divide-y divide-border">
                {result.checks.map((check) => (
                  <CheckItem
                    key={check.id}
                    passed={check.passed}
                    label={check.label}
                    detail={check.detail}
                  />
                ))}
              </ul>
            </div>

            {result.parsed && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("parsedComponents")}
                </h3>
                <dl className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
                  {[
                    { label: "IBAN", value: result.normalized.replace(/(.{4})/g, "$1 ").trim(), mono: true },
                    { label: t("length"), value: `${result.parsed.length} / ${result.parsed.expectedLength ?? "—"}` },
                    { label: t("checkDigits"), value: result.parsed.checkDigits, mono: true },
                    result.parsed.bankCode && { label: t("bankCode"), value: result.parsed.bankCode, mono: true },
                    result.parsed.branchCode && { label: t("branchCode"), value: result.parsed.branchCode, mono: true },
                    result.parsed.accountNumber && { label: t("accountNumber"), value: result.parsed.accountNumber, mono: true },
                    result.parsed.nationalCheck && { label: t("nationalCheck"), value: result.parsed.nationalCheck, mono: true },
                  ]
                    .filter(Boolean)
                    .map((row) => {
                      const entry = row as { label: string; value: string; mono?: boolean };
                      return (
                        <div
                          key={entry.label}
                          className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                        >
                          <dt className="text-muted-foreground">{entry.label}</dt>
                          <dd className={cn("font-medium", entry.mono && "font-mono")}>
                            {entry.value}
                          </dd>
                        </div>
                      );
                    })}
                </dl>
                <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t("ibanDisclaimer")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
