"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cancelSubscription,
  confirmSubscription,
  fetchBillingSummary,
  fetchInvoices,
  fetchMe,
  reviseSubscription,
  startCheckout,
} from "@/lib/portal/api";
import { portalErrorMessage } from "@/lib/portal/errors";
import { loadPayPalSdk, type PayPalButtonsInstance } from "@/lib/portal/paypal";
import type {
  BillingInvoiceData,
  BillingPlanData,
  BillingSummaryData,
  BillingSubscriptionData,
} from "@/lib/portal/types";
import { siteConfig } from "@/lib/site";

/**
 * Billing panel (FIN-019): shows the effective plan derived from the PayPal
 * subscription and lets the owner subscribe through PayPal Checkout, switch
 * plans via the revise/approve flow, stop renewal and inspect recent invoices.
 * No payment secrets reach the browser: the button only calls the API for a
 * subscription id and PayPal redirects back after approval.
 */

const ENTITLED_STATUSES = new Set(["ACTIVE", "APPROVED", "SUSPENDED"]);
const CANCELABLE_STATUSES = new Set(["ACTIVE", "APPROVED", "SUSPENDED"]);
const PENDING_STATUSES = new Set(["APPROVAL_PENDING", "PENDING"]);

function statusMessageKey(status: string): string | null {
  switch (status) {
    case "APPROVAL_PENDING":
    case "PENDING":
      return "billingStatusApprovalPending";
    case "APPROVED":
      return "billingStatusApproved";
    case "ACTIVE":
      return "billingStatusActive";
    case "SUSPENDED":
      return "billingStatusSuspended";
    case "CANCELLED":
      return "billingStatusCancelled";
    case "EXPIRED":
      return "billingStatusExpired";
    default:
      return null;
  }
}

/** Mirrors BillingService.isEntitled: cancelled keeps access until period end. */
function isEntitled(subscription: BillingSubscriptionData | null): boolean {
  if (!subscription) {
    return false;
  }
  if (ENTITLED_STATUSES.has(subscription.status)) {
    return true;
  }
  return (
    subscription.status === "CANCELLED" &&
    !!subscription.next_billing_time &&
    new Date(subscription.next_billing_time).getTime() > Date.now()
  );
}

/** PayPal Buttons wrapper: created once per selected plan, torn down on switch. */
function PayPalSubscribeButton({
  plan,
  onConfirmed,
  onFailure,
}: {
  plan: string;
  onConfirmed: () => void;
  onFailure: (error: unknown) => void;
}) {
  const t = useTranslations("portal");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonsRef = useRef<PayPalButtonsInstance | null>(null);
  const [sdkError, setSdkError] = useState(false);

  useEffect(() => {
    let active = true;
    setSdkError(false);
    if (!siteConfig.paypalClientId) {
      setSdkError(true);
      return;
    }
    loadPayPalSdk(siteConfig.paypalClientId)
      .then((paypal) => {
        if (!active || !containerRef.current) {
          return;
        }
        const buttons = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "subscribe" },
          createSubscription: async () => {
            const checkout = await startCheckout(plan);
            return checkout.subscription_id;
          },
          onApprove: async (data) => {
            if (!data.subscriptionID) {
              onFailure(new Error("PAYPAL_SUBSCRIPTION_MISSING"));
              return;
            }
            try {
              await confirmSubscription(data.subscriptionID);
              onConfirmed();
            } catch (caught) {
              onFailure(caught);
            }
          },
          onCancel: () => {
            /* Buyer closed the PayPal window: no state change needed. */
          },
          onError: (caught) => onFailure(caught),
        });
        buttonsRef.current = buttons;
        void buttons.render(containerRef.current);
      })
      .catch(() => {
        if (active) {
          setSdkError(true);
        }
      });
    return () => {
      active = false;
      buttonsRef.current?.close?.();
      buttonsRef.current = null;
    };
  }, [plan, onConfirmed, onFailure]);

  if (sdkError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("billingSdkError")}
      </p>
    );
  }
  return <div ref={containerRef} className="min-h-[45px] max-w-sm" />;
}

export function BillingPanel() {
  const t = useTranslations("portal");
  const tPricing = useTranslations("pricing");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [summary, setSummary] = useState<BillingSummaryData | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoiceData | null>(null);
  const [invoicesError, setInvoicesError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestedPlan, setRequestedPlan] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchBillingSummary(), fetchMe()])
      .then(([billing, me]) => {
        if (!active) {
          return;
        }
        setSummary(billing);
        setRole(me.organizations[0]?.role ?? null);
      })
      .catch((caught) => {
        if (active) {
          setError(caught);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Pricing CTAs link here with ?plan=developer|startup|business.
  useEffect(() => {
    const requested = searchParams.get("plan");
    if (requested) {
      setRequestedPlan(requested.toUpperCase());
    }
  }, [searchParams]);

  // Invoice history follows the subscription id (initial load + activations).
  const subscriptionId = summary?.subscription?.subscription_id ?? null;
  useEffect(() => {
    if (!subscriptionId) {
      setInvoices(null);
      setInvoicesError(null);
      return;
    }
    let active = true;
    fetchInvoices(subscriptionId)
      .then((data) => {
        if (active) {
          setInvoices(data);
          setInvoicesError(null);
        }
      })
      .catch((caught) => {
        if (active) {
          setInvoices(null);
          setInvoicesError(caught);
        }
      });
    return () => {
      active = false;
    };
  }, [subscriptionId]);

  const refresh = useCallback(async () => {
    setBusy(true);
    setActionError(null);
    try {
      const data = await fetchBillingSummary();
      setSummary(data);
      if (data.subscription) {
        try {
          setInvoices(await fetchInvoices(data.subscription.subscription_id));
          setInvoicesError(null);
        } catch (caught) {
          setInvoicesError(caught);
        }
      }
    } catch (caught) {
      setActionError(caught);
    } finally {
      setBusy(false);
    }
  }, []);

  const onConfirmed = useCallback(() => {
    setNotice(t("billingConfirmed"));
    void refresh();
  }, [refresh, t]);

  const onProviderFailure = useCallback((caught: unknown) => {
    setActionError(caught);
  }, []);

  const subscription = summary?.subscription ?? null;
  const entitled = isEntitled(subscription);
  const canManage = role === "OWNER";
  const providerConfigured = summary?.provider.configured === true;
  const purchasablePlans = summary?.plans.filter((item) => item.checkout_available) ?? [];
  const selectedPlan =
    requestedPlan && purchasablePlans.some((item) => item.plan === requestedPlan)
      ? requestedPlan
      : null;
  const planData = summary?.plans.find((item) => item.plan === summary.plan) ?? null;

  const numberFormat = new Intl.NumberFormat(locale);
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function formatDate(value?: string): string {
    if (!value) {
      return "—";
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : dateFormat.format(parsed);
  }

  function formatLimit(value?: number): string {
    if (value === undefined || value >= 10_000_000) {
      return t("billingUnlimited");
    }
    return numberFormat.format(value);
  }

  function planName(plan: string): string {
    return tPricing(`${plan.toLowerCase()}.name`);
  }

  function limitsText(plan: BillingPlanData): string {
    const rate = t("billingRateLimit", { count: formatLimit(plan.requests_per_minute) });
    const quota = t("billingMonthlyQuota", { count: formatLimit(plan.monthly_quota) });
    return `${rate} · ${quota}`;
  }

  async function onChangePlan(plan: string): Promise<void> {
    if (!subscription) {
      return;
    }
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const result = await reviseSubscription(subscription.subscription_id, plan);
      window.location.assign(result.approve_url);
    } catch (caught) {
      setActionError(caught);
      setBusy(false);
    }
  }

  async function onCancel(): Promise<void> {
    if (!subscription) {
      return;
    }
    if (!window.confirm(t("billingCancelConfirm"))) {
      return;
    }
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await cancelSubscription(subscription.subscription_id);
      await refresh();
    } catch (caught) {
      setActionError(caught);
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }
  if (error || !summary) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {portalErrorMessage(error, t)}
      </p>
    );
  }

  const statusKey = subscription ? statusMessageKey(subscription.status) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("billingTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("billingSubtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("billingCurrentPlan")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-semibold">{planName(summary.plan)}</span>
            {statusKey && <Badge variant="secondary">{t(statusKey)}</Badge>}
          </div>
          {planData && <p className="text-sm text-muted-foreground">{limitsText(planData)}</p>}
          {subscription?.start_time && (
            <p className="text-sm text-muted-foreground">
              {t("billingSince")} {formatDate(subscription.start_time)}
            </p>
          )}
          {subscription?.next_billing_time && (
            <p className="text-sm text-muted-foreground">
              {t("billingNextBilling")} {formatDate(subscription.next_billing_time)}
            </p>
          )}
          {subscription?.status === "CANCELLED" && subscription.next_billing_time && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t("billingCancelledUntil", { date: formatDate(subscription.next_billing_time) })}
            </p>
          )}
          {subscription && PENDING_STATUSES.has(subscription.status) && (
            <p className="text-sm text-muted-foreground">{t("billingApprovalPending")}</p>
          )}
          {!subscription && <p className="text-sm text-muted-foreground">{t("billingFreeHint")}</p>}

          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={busy}>
              {busy ? t("billingProcessing") : t("billingRefresh")}
            </Button>
            {canManage && subscription && CANCELABLE_STATUSES.has(subscription.status) && (
              <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
                {t("billingCancel")}
              </Button>
            )}
          </div>

          {!canManage && <p className="text-xs text-muted-foreground">{t("billingOwnerOnly")}</p>}
          {notice && (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {notice}
            </p>
          )}
          {actionError != null && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {portalErrorMessage(actionError, t)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("billingPlansTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!providerConfigured ? (
            <p className="text-sm text-muted-foreground">{t("billingNoProvider")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("billingPlansSubtitle")}</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {purchasablePlans.map((item) => {
                  const name = planName(item.plan);
                  const isCurrent = item.plan === summary.plan;
                  return (
                    <li key={item.plan} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{name}</span>
                        <span className="text-sm text-muted-foreground">
                          {tPricing(`${item.plan.toLowerCase()}.price`)}
                          {tPricing("perMonth")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{limitsText(item)}</p>
                      <div className="mt-3">
                        {isCurrent ? (
                          <Badge variant="outline">{t("billingCurrentBadge")}</Badge>
                        ) : entitled && canManage ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onChangePlan(item.plan)}
                            disabled={busy}
                          >
                            {t("billingChangeTo", { plan: name })}
                          </Button>
                        ) : canManage ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={selectedPlan === item.plan ? "secondary" : "outline"}
                            onClick={() => setRequestedPlan(item.plan)}
                            disabled={busy}
                          >
                            {t("billingSubscribeTo", { plan: name })}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {!entitled && canManage && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
                  {selectedPlan ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          {t("billingSubscribeTo", { plan: planName(selectedPlan) })}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRequestedPlan(null)}
                        >
                          {t("keysCancel")}
                        </Button>
                      </div>
                      <PayPalSubscribeButton
                        plan={selectedPlan}
                        onConfirmed={onConfirmed}
                        onFailure={onProviderFailure}
                      />
                      <p className="text-xs text-muted-foreground">{t("billingCheckoutNote")}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("billingChoosePlan")}</p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>{t("billingInvoices")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("billingInvoicesSubtitle")}</p>
            {invoicesError ? (
              <p role="alert" className="text-sm text-destructive">
                {portalErrorMessage(invoicesError, t)}
              </p>
            ) : !invoices ? (
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : invoices.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("billingInvoicesEmpty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{t("billingInvoiceDate")}</th>
                      <th className="py-2 pr-4 font-medium">{t("billingInvoiceAmount")}</th>
                      <th className="py-2 font-medium">{t("billingInvoiceStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.transactions.map((line, index) => (
                      <tr key={line.id || index} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-4">{formatDate(line.time)}</td>
                        <td className="py-2 pr-4">
                          {line.amount ? `${line.amount} ${line.currency ?? ""}`.trim() : "—"}
                        </td>
                        <td className="py-2">
                          {line.status === "COMPLETED" ? t("billingInvoicePaid") : line.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
