"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/i18n/I18nProvider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      totpCode: totpCode || undefined,
      redirect: false,
    });

    if (result?.error) {
      // NextAuth surfaces the Error message in result.error (CredentialsSignin error).
      const msg = result.error;
      if (msg === "CredentialsSignin" || msg?.includes("totp_required")) {
        // Could be either invalid password OR TOTP required — if we already supplied
        // a TOTP it's the latter; if we haven't, prompt for one.
        if (!needsTotp) {
          setNeedsTotp(true);
          setError("");
        } else {
          setError(t("auth.invalidCredentials"));
        }
      } else if (msg?.includes("totp_invalid")) {
        setError(t("auth.invalidTotp"));
      } else {
        setError(t("auth.invalidCredentials"));
      }
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          {t("auth.email")}
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          {t("auth.password")}
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.passwordPlaceholder")}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </div>

      {needsTotp && (
        <div>
          <label htmlFor="totpCode" className="block text-sm font-medium text-foreground mb-1">
            🔐 {t("auth.totpCode")}
          </label>
          <input
            id="totpCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={11}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="123 456"
            autoFocus
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-base font-mono tracking-widest text-center placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
          <p className="text-xs text-muted mt-1">{t("auth.totpHelp")}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {loading ? t("common.loading") : t("auth.submit")}
      </button>

      <p className="text-center text-sm text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          {t("auth.register")}
        </Link>
      </p>
    </form>
  );
}
