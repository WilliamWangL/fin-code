"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";

/** Payload of GET /v1/sort-code/{code} — field names mirror the API response. */
interface SortCodeData {
  sort_code: string;
  formatted: string;
  bank: {
    id: string;
    name_en: string | null;
    name_local?: string | null;
    short_name?: string | null;
    country?: string | null;
  } | null;
  city?: string | null;
  status: string;
  source?: { name: string; source_type?: string | null } | null;
}

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: SortCodeData }
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "rate-limited" }
  | { status: "error" };

/** Six digits, optionally written as 3 dash pairs: 20-00-00 / 200000. */
const SORT_CODE_PATTERN = /^\d{6}$/;

/**
 * Sort code lookup box for the /sort-codes directory page. Calls the public
 * /v1/sort-code endpoint (anonymous, IP rate-limited); the API answers from
 * the directory tables and only then from the external provider, storing any
 * hit so repeat lookups stay local.
 */
export function SortCodeLookup() {
  const t = useTranslations("tool");
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [state, setState] = useState<LookupState>({ status: "idle" });

  const runLookup = async (raw: string) => {
    const code = raw.replace(/[\s-]/g, "");
    if (!SORT_CODE_PATTERN.test(code)) {
      setState({ status: "invalid" });
      return;
    }
    setState({ status: "loading" });
    try {
      const response = await fetch(`${siteConfig.apiBaseUrl}/sort-code/${code}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: SortCodeData;
        error?: { code?: string };
      } | null;
      if (response.ok && payload?.data) {
        setState({ status: "success", data: payload.data });
        return;
      }
      const errorCode = payload?.error?.code ?? "";
      if (response.status === 404 || errorCode === "NOT_FOUND") {
        setState({ status: "not-found" });
      } else if (response.status === 429 || errorCode === "RATE_LIMITED") {
        setState({ status: "rate-limited" });
      } else if (response.status === 422 || errorCode === "INVALID_SORT_CODE") {
        setState({ status: "invalid" });
      } else {
        setState({ status: "error" });
      }
    } catch {
      setState({ status: "error" });
    }
  };

  const errorMessage =
    state.status === "invalid"
      ? t("sortCodeInvalid")
      : state.status === "not-found"
        ? t("sortCodeNotFound")
        : state.status === "rate-limited"
          ? t("sortCodeRateLimited")
          : state.status === "error"
            ? t("sortCodeLookupError")
            : null;

  const bankName = (data: SortCodeData) =>
    data.bank?.short_name || data.bank?.name_en || data.bank?.name_local || null;

  return (
    <section aria-labelledby="sort-code-lookup-title" className="mt-10 rounded-xl border border-border bg-card p-6">
      <h2 id="sort-code-lookup-title" className="text-xl font-semibold tracking-tight">
        {t("sortCodeLookupTitle")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("sortCodeLookupBody")}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(value);
          void runLookup(value);
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <div className="flex-1">
          <label htmlFor="sort-code-input" className="sr-only">
            {t("sortCodeEnter")}
          </label>
          <Input
            id="sort-code-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("sortCodePlaceholder")}
            className="h-12 font-mono text-base"
            autoComplete="off"
            spellCheck={false}
            inputMode="numeric"
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
        <p className="mt-4 text-sm text-muted-foreground">{t("sortCodeLookingUp")}</p>
      )}

      {errorMessage && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p>{errorMessage}</p>
        </div>
      )}

      {state.status === "success" &&
        (() => {
          const data = state.data;
          const name = bankName(data);
          const rows = [
            { label: t("sortCodeBankLabel"), value: name },
            { label: t("sortCodeCityLabel"), value: data.city ?? null },
            { label: t("sortCodeStatusLabel"), value: data.status },
            { label: t("sortCodeSourceLabel"), value: data.source?.name ?? null },
          ].filter((row) => row.value !== null && row.value !== "");

          return (
            <div className="mt-4 rounded-xl border border-success/40 bg-success/5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                <p className="text-lg font-semibold">{name ?? data.formatted}</p>
                <Badge variant="secondary" className="font-mono">
                  {data.formatted}
                </Badge>
                {data.bank?.country && <Badge variant="outline">{data.bank.country}</Badge>}
              </div>

              <dl className="mt-4 max-w-xl divide-y divide-border rounded-lg border border-border bg-card">
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

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={`/sort-codes/${data.formatted}`}
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  {t("sortCodeViewDetail")}
                </Link>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t("sortCodeDisclaimer")}
                </p>
              </div>
            </div>
          );
        })()}
    </section>
  );
}
