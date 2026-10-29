"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { useLookupQuota } from "@/lib/lookup-quota";
import { normalizeIdentifier } from "@/lib/identifiers";
import { siteConfig } from "@/lib/site";

/** Identifier types rendered by the shared lookup box (table-backed lookups). */
export type LookupType = "SWIFT" | "ABA_ROUTING" | "SORT_CODE" | "BSB" | "IFSC" | "CNAPS";

interface LookupKind {
  /** /v1 path segment of the lookup endpoint. */
  segment: string;
  /** Directory route that holds the detail pages. */
  basePath: string;
  /** Mirrors IdentifierFormatValidator so a typo never costs a lookup. */
  pattern: RegExp;
  /** Display form, mirroring the API's `formatted` field. */
  format?: (value: string) => string;
}

const KINDS: Record<LookupType, LookupKind> = {
  SWIFT: {
    segment: "swift",
    basePath: "/swift-codes",
    pattern: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  },
  ABA_ROUTING: { segment: "routing", basePath: "/routing-numbers", pattern: /^\d{9}$/ },
  SORT_CODE: {
    segment: "sort-code",
    basePath: "/sort-codes",
    pattern: /^\d{6}$/,
    format: (value) => `${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4)}`,
  },
  BSB: {
    segment: "bsb",
    basePath: "/bsb",
    pattern: /^\d{6}$/,
    format: (value) => `${value.slice(0, 3)}-${value.slice(3)}`,
  },
  IFSC: { segment: "ifsc", basePath: "/ifsc", pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
  CNAPS: { segment: "cnaps", basePath: "/cnaps", pattern: /^\d{12}$/ },
};

/** Payload of the lookup endpoints; field names mirror the API response. */
interface LookupBank {
  name_en?: string | null;
  name_local?: string | null;
  short_name?: string | null;
  country?: string | null;
}

interface LookupData {
  formatted?: string;
  city?: string | null;
  state?: string | null;
  branch?: string | null;
  status?: string | null;
  bank?: LookupBank | null;
  source?: { name?: string | null } | null;
}

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: LookupData; shown: string }
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "rate-limited" }
  | { status: "limited" }
  | { status: "error" };

/**
 * Live lookup box for the identifier directory pages. Calls the public
 * /v1/&lt;type&gt; endpoint (anonymous, IP rate-limited) and shares the daily
 * allowance with every other lookup box on the site; hits resolved from the
 * external providers are stored by the API, so the follow-up detail page works
 * for codes that are not in the static list.
 */
export function IdentifierLookup({ type }: { type: LookupType }) {
  const t = useTranslations("lookup");
  const quota = useLookupQuota();
  const kind = KINDS[type];

  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [state, setState] = useState<LookupState>({ status: "idle" });

  const runLookup = async (raw: string) => {
    const code = normalizeIdentifier(type, raw);
    if (!kind.pattern.test(code)) {
      setState({ status: "invalid" });
      return;
    }
    if (quota.exhausted) {
      setState({ status: "limited" });
      return;
    }
    quota.record();
    setState({ status: "loading" });
    try {
      const response = await fetch(`${siteConfig.apiBaseUrl}/${kind.segment}/${code}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      quota.sync(response);
      const payload = (await response.json().catch(() => null)) as {
        data?: LookupData;
        error?: { code?: string };
      } | null;
      if (response.ok && payload?.data) {
        setState({ status: "success", data: payload.data, shown: kind.format?.(code) ?? code });
        return;
      }
      const errorCode = payload?.error?.code ?? "";
      if (errorCode === "DAILY_LIMIT_EXCEEDED") {
        setState({ status: "limited" });
      } else if (response.status === 404 || errorCode === "NOT_FOUND") {
        setState({ status: "not-found" });
      } else if (response.status === 429 || errorCode === "RATE_LIMITED") {
        setState({ status: "rate-limited" });
      } else if (response.status === 422 || errorCode.startsWith("INVALID_")) {
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
      ? t("invalid", { hint: t(`types.${type}.hint`) })
      : state.status === "not-found"
        ? t("notFound")
        : state.status === "rate-limited"
          ? t("rateLimited")
          : state.status === "limited"
            ? t("limitReached", { limit: quota.limit })
            : state.status === "error"
              ? t("lookupError")
              : null;

  const bankName = (data: LookupData) =>
    data.bank?.short_name || data.bank?.name_en || data.bank?.name_local || null;

  return (
    <section
      aria-labelledby={`${kind.segment}-lookup-title`}
      className="mt-10 rounded-xl border border-border bg-card p-6"
    >
      <h2 id={`${kind.segment}-lookup-title`} className="text-xl font-semibold tracking-tight">
        {t(`types.${type}.title`)}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("body")}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(value);
          void runLookup(value);
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <div className="flex-1">
          <label htmlFor={`${kind.segment}-lookup-input`} className="sr-only">
            {t(`types.${type}.title`)}
          </label>
          <Input
            id={`${kind.segment}-lookup-input`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t(`types.${type}.placeholder`)}
            className="h-12 font-mono text-base"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button type="submit" size="lg" className="h-12" disabled={state.status === "loading"}>
          {t("button")}
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

      <p className="mt-2 text-xs text-muted-foreground">
        {t("remaining", { remaining: quota.remaining, limit: quota.limit })}
      </p>

      {state.status === "loading" && (
        <p className="mt-3 text-sm text-muted-foreground">{t("searching")}</p>
      )}

      {errorMessage && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p>{errorMessage}</p>
        </div>
      )}

      {state.status === "success" &&
        (() => {
          const { data, shown } = state;
          const name = bankName(data);
          const rows = [
            { label: t("bank"), value: name },
            { label: t("branch"), value: data.branch ?? null },
            { label: t("city"), value: data.city ?? null },
            { label: t("state"), value: data.state ?? null },
            { label: t("status"), value: data.status ?? null },
            { label: t("source"), value: data.source?.name ?? null },
          ].filter((row) => row.value !== null && row.value !== "");

          return (
            <div className="mt-3 rounded-xl border border-success/40 bg-success/5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                <p className="text-lg font-semibold">{name ?? shown}</p>
                <Badge variant="secondary" className="font-mono">
                  {data.formatted ?? shown}
                </Badge>
                {data.bank?.country && <Badge variant="outline">{data.bank.country}</Badge>}
              </div>

              {rows.length > 0 && (
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
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={`${kind.basePath}/${data.formatted ?? shown}`}
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  {t("viewDetail")}
                </Link>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t("disclaimer")}
                </p>
              </div>
            </div>
          );
        })()}
    </section>
  );
}
