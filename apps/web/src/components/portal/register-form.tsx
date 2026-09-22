"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { register, savePortalSession } from "@/lib/portal/api";
import { portalErrorMessage } from "@/lib/portal/errors";

/**
 * Account registration for the developer portal (FIN-017). Registration
 * creates the user, their organization and the first tokens in one call, so
 * the browser lands on the dashboard signed in.
 */
export function RegisterForm() {
  const t = useTranslations("portal");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await register({
        email,
        password,
        name: name.trim() || undefined,
      });
      savePortalSession(data.tokens, { email: data.user.email, name: data.user.name });
      router.push("/dashboard");
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
        <label htmlFor="register-name" className="text-sm font-medium">
          {t("name")}
        </label>
        <Input
          id="register-name"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={name}
          placeholder={t("namePlaceholder")}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t("nameOptional")}</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="register-email" className="text-sm font-medium">
          {t("email")}
        </label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          placeholder={t("emailPlaceholder")}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="register-password" className="text-sm font-medium">
          {t("password")}
        </label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={password}
          placeholder={t("passwordPlaceholder")}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="register-confirm" className="text-sm font-medium">
          {t("confirmPassword")}
        </label>
        <Input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t("creatingAccount") : t("signUp")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </form>
  );
}
