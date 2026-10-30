"use client";

import { CheckCircle2, Info, Landmark, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CheckItem } from "@/components/check-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { validateIban } from "@/lib/iban";

/** Bank block of GET /v1/iban/{iban} — field names mirror the API response. */
interface IbanBank {
  swift_code: string;
  bic: string;
  city: string | null;
  status: string | null;
  bank?: {
    name_en: string | null;
    name_local: string | null;
    country: string | null;
  } | null;
}

type BankLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; bank: IbanBank }
  | { status: "no-bank" }
  | { status: "rate-limited" }
  | { status: "error" };

export function IbanValidator() {
  const t = useTranslations("tool");
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [bankState, setBankState] = useState<BankLookupState>({ status: "idle" });

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

  // Locally valid IBANs are enriched through the public /v1/iban/{iban}
  // endpoint (anonymous, IP rate-limited): the bank resolves local-first on
  // the server and only hits the upstream provider on a directory miss.
  useEffect(() => {
    if (submitted === null) {
      setBankState({ status: "idle" });
      return;
    }
    const validation = validateIban(submitted);
    if (!validation.valid) {
      setBankState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setBankState({ status: "loading" });
    void (async () => {
      try {
        const response = await fetch(`${siteConfig.apiBaseUrl}/iban/${validation.normalized}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (cancelled) return;
        const payload = (await response.json().catch(() => null)) as {
          data?: { bank?: IbanBank };
          error?: { code?: string };
        } | null;
        if (response.ok && payload?.data) {
          // A valid IBAN with an unknown bank omits the bank field entirely.
          if (payload.data.bank) {
            setBankState({ status: "found", bank: payload.data.bank });
          } else {
            setBankState({ status: "no-bank" });
          }
          return;
        }
        const code = payload?.error?.code ?? "";
        if (response.status === 429 || code === "RATE_LIMITED") {
          setBankState({ status: "rate-limited" });
        } else {
          setBankState({ status: "error" });
        }
      } catch {
        if (!cancelled) {
          setBankState({ status: "error" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submitted]);

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

      {result?.valid && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Landmark className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("ibanBankTitle")}
            </h3>
            {bankState.status === "found" && (
              <Badge variant="secondary" className="font-mono">
                {bankState.bank.swift_code}
              </Badge>
            )}
          </div>

          {bankState.status === "loading" && (
            <p className="mt-3 text-sm text-muted-foreground">{t("ibanLookingUp")}</p>
          )}

          {bankState.status === "found" &&
            (() => {
              const bank = bankState.bank;
              const rows = [
                {
                  label: t("ibanBankName"),
                  value: bank.bank?.name_en ?? bank.bank?.name_local ?? null,
                },
                { label: t("ibanBankCity"), value: bank.city },
                { label: t("ibanBankCountry"), value: bank.bank?.country },
              ].filter((row) => row.value !== null && row.value !== "");
              if (rows.length === 0) {
                return <p className="mt-3 text-sm text-muted-foreground">{t("ibanBankNotFound")}</p>;
              }
              return (
                <dl className="mt-3 divide-y divide-border rounded-lg border border-border">
                  {rows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                    >
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="text-right font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              );
            })()}

          {bankState.status === "no-bank" && (
            <p className="mt-3 text-sm text-muted-foreground">{t("ibanBankNotFound")}</p>
          )}
          {bankState.status === "rate-limited" && (
            <p className="mt-3 text-sm text-muted-foreground">{t("ibanRateLimited")}</p>
          )}
          {bankState.status === "error" && (
            <p className="mt-3 text-sm text-muted-foreground">{t("ibanLookupError")}</p>
          )}
        </div>
      )}
    </div>
  );
}
