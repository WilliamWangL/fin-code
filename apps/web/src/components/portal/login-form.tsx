"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { login, savePortalSession } from "@/lib/portal/api";
import { portalErrorMessage } from "@/lib/portal/errors";

/**
 * Sign-in form for the developer portal (FIN-017). On success the tokens are
 * stored and the browser is sent to the `next` path (dashboard by default).
 */
export function LoginForm() {
  const t = useTranslations("portal");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await login({ email, password });
      savePortalSession(data.tokens, { email: data.user.email, name: data.user.name });
      router.push(safeNext(searchParams.get("next")));
      router.refresh();
    } catch (caught) {
      setError(portalErrorMessage(caught, t));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm font-medium">
          {t("email")}
        </label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          placeholder={t("emailPlaceholder")}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="login-password" className="text-sm font-medium">
          {t("password")}
        </label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          placeholder={t("passwordPlaceholder")}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t("signingIn") : t("signIn")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("createOne")}
        </Link>
      </p>
    </form>
  );
}

/** Only allow same-site relative redirects after sign-in. */
function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
}
