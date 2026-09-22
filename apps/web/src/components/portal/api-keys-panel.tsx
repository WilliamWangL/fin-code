"use client";

import { KeyRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { CopyButton } from "@/components/portal/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createApiKey, fetchApiKeys, revokeApiKey, rotateApiKey } from "@/lib/portal/api";
import { portalErrorMessage } from "@/lib/portal/errors";
import type { ApiKeyCreatedData, ApiKeyData } from "@/lib/portal/types";

/**
 * API key management (FIN-017): list, create, rotate and revoke keys of the
 * organization. The plaintext key is shown exactly once, right after creation
 * or rotation, mirroring the API contract.
 */
export function ApiKeysPanel() {
  const t = useTranslations("portal");
  const locale = useLocale();
  const [keys, setKeys] = useState<ApiKeyData[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [revealed, setRevealed] = useState<ApiKeyCreatedData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [live, setLive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const load = useCallback((): void => {
    setError(null);
    fetchApiKeys()
      .then(setKeys)
      .catch(setError);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await createApiKey({ name: name.trim(), live });
      setKeys((previous) => [created.api_key, ...(previous ?? [])]);
      setRevealed(created);
      setName("");
      setLive(false);
      setShowForm(false);
    } catch (caught) {
      setError(caught);
    } finally {
      setCreating(false);
    }
  }

  async function onRotate(key: ApiKeyData): Promise<void> {
    if (!window.confirm(t("keysRotateConfirm"))) {
      return;
    }
    setPendingId(key.id);
    setError(null);
    try {
      const created = await rotateApiKey(key.id);
      setKeys((previous) =>
        (previous ?? []).map((item) => (item.id === key.id ? created.api_key : item)),
      );
      setRevealed(created);
    } catch (caught) {
      setError(caught);
    } finally {
      setPendingId(null);
    }
  }

  async function onRevoke(key: ApiKeyData): Promise<void> {
    if (!window.confirm(t("keysRevokeConfirm"))) {
      return;
    }
    setPendingId(key.id);
    setError(null);
    try {
      const revoked = await revokeApiKey(key.id);
      setKeys((previous) => (previous ?? []).map((item) => (item.id === key.id ? revoked : item)));
    } catch (caught) {
      setError(caught);
    } finally {
      setPendingId(null);
    }
  }

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const formatDate = (value: string | null): string =>
    value ? dateFormat.format(new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`)) : t("keysNever");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("keysTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("keysSubtitle")}</p>
      </header>

      {error !== null && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {portalErrorMessage(error, t, "keysError")}
        </p>
      )}

      {revealed && (
        <Card className="border-warning/40 bg-warning/10">
          <CardHeader>
            <CardTitle>{t("keysRevealTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("keysRevealBody")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs">
                {revealed.key}
              </code>
              <CopyButton value={revealed.key} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRevealed(null)}>
              {t("dismiss")}
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("keysCreateTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="space-y-4" noValidate>
              <div className="space-y-2">
                <label htmlFor="key-name" className="text-sm font-medium">
                  {t("keysCreateName")}
                </label>
                <Input
                  id="key-name"
                  required
                  maxLength={100}
                  value={name}
                  placeholder={t("keysCreateNamePlaceholder")}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={live}
                  onChange={(event) => setLive(event.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="font-medium">{t("keysLive")}</span>
              </label>
              <p className="text-xs text-muted-foreground">{t("keysLiveHint")}</p>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? t("keysCreating") : t("keysCreate")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  {t("keysCancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button type="button" onClick={() => setShowForm(true)}>
          <KeyRound className="h-4 w-4" aria-hidden />
          {t("keysCreate")}
        </Button>
      )}

      {keys === null ? (
        error ? null : <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("keysEmpty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("keysName")}</TableHead>
              <TableHead>{t("keysKey")}</TableHead>
              <TableHead>{t("plan")}</TableHead>
              <TableHead>{t("keysStatus")}</TableHead>
              <TableHead>{t("keysCreated")}</TableHead>
              <TableHead>{t("keysLastUsed")}</TableHead>
              <TableHead className="text-right">{t("keysActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => {
              const active = key.status === "ACTIVE";
              const pending = pendingId === key.id;
              return (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-xs">{key.key_prefix}…</TableCell>
                  <TableCell>
                    <Badge variant="outline">{key.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={active ? "success" : "destructive"}>
                      {active ? t("keysActive") : t("keysRevoked")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(key.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(key.last_used_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!active || pending}
                        onClick={() => onRotate(key)}
                      >
                        {t("keysRotate")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!active || pending}
                        onClick={() => onRevoke(key)}
                      >
                        {t("keysRevoke")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
