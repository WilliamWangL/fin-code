"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { lookupConfigs, type LookupType } from "@/lib/lookup";
import { siteConfig } from "@/lib/site";

/** Bank block shared by every identifier payload (CommonDtos.BankSummary). */
interface LookupBank {
  id: string;
  name_en: string | null;
  name_local?: string | null;
  short_name?: string | null;
  country?: string | null;
}

/** Union of the fields the five public lookups can return. */
interface LookupPayload {
  bank: LookupBank | null;
  city?: string | null;
  state?: string | null;
  branch?: string | null;
  status?: string | null;
  bank_code?: string | null;
  formatted?: string | null;
  swift_code?: string;
  routing_number?: string;
  sort_code?: string;
  bsb?: string;
  cnaps?: string;
  checksum_valid?: boolean;
  source?: { name?: string | null } | null;
}

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: LookupPayload }
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "rate-limited" }
  | { status: "error" };

/**
 * Live lookup box for a directory page. Calls the public /v1 endpoint without
 * an API key, so it shares the anonymous per-IP bucket with the IBAN checker
 * and every other tool on the site: ten lookups a minute, then 429.
 *
 * Format checking happens here first, so a typo never spends a lookup.
 */
export function IdentifierLookup({ type }: { type: LookupType }) {
  const t = useTranslations("tool");
  const config = lookupConfigs[type];
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [state, setState] = useState<LookupState>({ status: "idle" });

  const runLookup = async (raw: string) => {
    const code = config.normalize(raw);
    if (!config.pattern.test(code)) {
      setState({ status: "invalid" });
      return;
    }
    setState({ status: "loading" });
    try {
      const response = await fetch(`${siteConfig.apiBaseUrl}/${config.endpoint}/${code}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: LookupPayload;
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
      ? t(`${config.messageKey}LookupInvalid`)
      : state.status === "not-found"
        ? t(`${config.messageKey}LookupNotFound`)
        : state.status === "rate-limited"
          ? t("lookupRateLimited")
          : state.status === "error"
            ? t("lookupError")
            : null;

  const buildRows = (data: LookupPayload) => {
    const bankName =
      data.bank?.short_name || data.bank?.name_en || data.bank?.name_local || null;
    const rows: Array<{ label: string; value: string | null }> = [
      { label: t("lookupBankLabel"), value: bankName },
    ];
    if (type === "BSB" || type === "CNAPS") {
      rows.push({ label: t("lookupBranchLabel"), value: data.branch ?? null });
    }
    if (type === "CNAPS") {
      rows.push({ label: t("lookupBankCodeLabel"), value: data.bank_code ?? null });
    }
    rows.push({ label: t("lookupCityLabel"), value: data.city ?? null });
    if (type === "ABA_ROUTING" || type === "BSB") {
      rows.push({ label: t("lookupStateLabel"), value: data.state ?? null });
    }
    rows.push({ label: t("lookupStatusLabel"), value: data.status ?? null });
    rows.push({ label: t("lookupSourceLabel"), value: data.source?.name ?? null });
    return rows.filter((row) => row.value !== null && row.value !== "");
  };

  return (
    <section
      aria-labelledby={`${config.endpoint}-lookup-title`}
      className="mt-10 rounded-xl border border-border bg-card p-6"
    >
      <h2
        id={`${config.endpoint}-lookup-title`}
        className="text-xl font-semibold tracking-tight"
      >
        {t(`${config.messageKey}LookupTitle`)}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {t(`${config.messageKey}LookupBody`)}
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(value);
          void runLookup(value);
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <div className="flex-1">
          <label htmlFor={`${config.endpoint}-lookup-input`} className="sr-only">
            {t("lookupEnter")}
          </label>
          <Input
            id={`${config.endpoint}-lookup-input`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={config.placeholder}
            className="h-12 font-mono text-base"
            autoComplete="off"
            spellCheck={false}
            inputMode={config.inputMode}
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
        <p className="mt-4 text-sm text-muted-foreground">{t("lookupLookingUp")}</p>
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
          const raw = data[config.valueKey as keyof LookupPayload];
          const code = typeof raw === "string" && raw ? raw : config.normalize(submitted ?? "");
          const display = data.formatted ?? code;
          const bankName =
            data.bank?.short_name || data.bank?.name_en || data.bank?.name_local || null;
          const rows = buildRows(data);

          return (
            <div className="mt-4 rounded-xl border border-success/40 bg-success/5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                <p className="text-lg font-semibold">{bankName ?? display}</p>
                <Badge variant="secondary" className="font-mono">
                  {display}
                </Badge>
                {data.bank?.country && <Badge variant="outline">{data.bank.country}</Badge>}
                {type === "ABA_ROUTING" && data.checksum_valid !== undefined && (
                  <Badge variant={data.checksum_valid ? "success" : "destructive"}>
                    {data.checksum_valid
                      ? t("lookupChecksumValid")
                      : t("lookupChecksumInvalid")}
                  </Badge>
                )}
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
                  href={`${config.basePath}/${display}`}
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  {t("lookupViewDetail")}
                </Link>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t("lookupDisclaimer")}
                </p>
              </div>
            </div>
          );
        })()}
    </section>
  );
}
