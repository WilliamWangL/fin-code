"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Payload of GET /v1/bin/{bin} — field names mirror the API response. */
interface BinData {
  bin: string;
  country_iso2: string | null;
  is_eu: boolean | null;
  is_eea: boolean | null;
  is_sepa: boolean | null;
  country: string | null;
  brand: string | null;
  type: string | null;
  categories: string[];
  issuer: string | null;
  is_valid: boolean | null;
}

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: BinData }
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "rate-limited" }
  | { status: "error" };

const BIN_PATTERN = /^\d{6,8}$/;

/** Common funding types, localized; unknown values fall back to the raw value. */
const CARD_TYPES: Record<string, { en: string; zh: string }> = {
  credit: { en: "Credit", zh: "信用卡" },
  debit: { en: "Debit", zh: "借记卡" },
  prepaid: { en: "Prepaid", zh: "预付卡" },
  charge: { en: "Charge", zh: "签账卡" },
};

export function BinChecker() {
  const t = useTranslations("tool");
  const locale = useLocale();
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [state, setState] = useState<LookupState>({ status: "idle" });

  // Support /bin-checker?bin=... deep links without making the page dynamic.
  useEffect(() => {
    if (initialized) return;
    const param = new URLSearchParams(window.location.search).get("bin");
    if (param) {
      setValue(param);
      setSubmitted(param);
    }
    setInitialized(true);
  }, [initialized]);

  // Query the public /v1/bin endpoint (anonymous, IP rate-limited) on submit.
  useEffect(() => {
    if (submitted === null) return;
    const bin = submitted.replace(/[\s-]/g, "");
    if (!BIN_PATTERN.test(bin)) {
      setState({ status: "invalid" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    void (async () => {
      try {
        const response = await fetch(`${siteConfig.apiBaseUrl}/bin/${bin}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (cancelled) return;
        const payload = (await response.json().catch(() => null)) as {
          data?: BinData;
          error?: { code?: string };
        } | null;
        if (response.ok && payload?.data) {
          setState({ status: "success", data: payload.data });
          return;
        }
        const code = payload?.error?.code ?? "";
        if (response.status === 404 || code === "NOT_FOUND") {
          setState({ status: "not-found" });
        } else if (response.status === 429 || code === "RATE_LIMITED") {
          setState({ status: "rate-limited" });
        } else if (response.status === 422 || code === "INVALID_BIN") {
          setState({ status: "invalid" });
        } else {
          setState({ status: "error" });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submitted]);

  const cardType = (type: string | null) =>
    type === null ? null : (CARD_TYPES[type]?.[locale === "zh" ? "zh" : "en"] ?? type);

  const errorMessage =
    state.status === "invalid"
      ? t("binInvalidFormat")
      : state.status === "not-found"
        ? t("binNotFound")
        : state.status === "rate-limited"
          ? t("binRateLimited")
          : state.status === "error"
            ? t("binLookupError")
            : null;

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
          <label htmlFor="bin-input" className="sr-only">
            {t("enterBin")}
          </label>
          <Input
            id="bin-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("binPlaceholder")}
            className="h-12 font-mono text-base"
            autoComplete="off"
            spellCheck={false}
            inputMode="numeric"
            aria-describedby="bin-disclaimer"
          />
        </div>
        <Button type="submit" size="lg" className="h-12" disabled={state.status === "loading"}>
          {t("lookup")}
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
              setState({ status: "idle" });
            }}
          >
            {t("clear")}
          </Button>
        )}
      </form>

      {state.status === "loading" && (
        <p className="text-sm text-muted-foreground">{t("binLookingUp")}</p>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p>{errorMessage}</p>
        </div>
      )}

      {state.status === "success" &&
        (() => {
          const data = state.data;
          const valid = data.is_valid !== false;
          const flags = [
            { key: "binEu", value: data.is_eu },
            { key: "binEea", value: data.is_eea },
            { key: "binSepa", value: data.is_sepa },
          ] as const;
          const rows = [
            { label: t("binIssuer"), value: data.issuer },
            {
              label: t("binCountry"),
              value: data.country
                ? data.country_iso2
                  ? `${data.country} (${data.country_iso2})`
                  : data.country
                : null,
            },
            { label: t("binBrand"), value: data.brand },
            { label: t("binType"), value: cardType(data.type) },
            {
              label: t("binCategories"),
              value: data.categories.length > 0 ? data.categories.join(", ") : null,
            },
          ].filter((row) => row.value !== null && row.value !== "");

          return (
            <div
              className={cn(
                "rounded-xl border p-6",
                valid
                  ? "border-success/40 bg-success/5"
                  : "border-destructive/40 bg-destructive/5",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {valid ? (
                  <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" aria-hidden />
                )}
                <p className="text-lg font-semibold">
                  {valid ? t("binValid") : t("binInvalid")}
                </p>
                <Badge variant="secondary" className="font-mono">
                  {data.bin}
                </Badge>
                {data.brand && <Badge variant="outline">{data.brand}</Badge>}
                {data.type && <Badge variant="outline">{cardType(data.type)}</Badge>}
              </div>

              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("binDetailsTitle")}
                  </h3>
                  <dl className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
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
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("binFlagsTitle")}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {flags.map((flag) => (
                      <Badge
                        key={flag.key}
                        variant={flag.value ? "success" : "outline"}
                        className={cn(!flag.value && "text-muted-foreground")}
                      >
                        {flag.value ? (
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                        ) : (
                          <XCircle className="h-3 w-3" aria-hidden />
                        )}
                        {t(flag.key)}
                      </Badge>
                    ))}
                  </div>
                  <p
                    id="bin-disclaimer"
                    className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t("binDisclaimer")}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
