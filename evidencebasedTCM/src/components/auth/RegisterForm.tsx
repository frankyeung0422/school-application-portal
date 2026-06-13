"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/i18n/I18nProvider";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const plan = searchParams.get("plan");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState(searchParams.get("role") ?? "PUBLIC");
  const [credentials, setCredentials] = useState("");
  const [institution, setInstitution] = useState("");
  const [orcidId, setOrcidId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, password, role,
          credentials: credentials || undefined,
          institution: institution || undefined,
          orcidId: orcidId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("auth.genericError"));
        setLoading(false);
        return;
      }

      const redirect = data.redirect as string | undefined;

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        router.push("/login");
      } else if (plan === "professional" || plan === "clinic") {
        try {
          const checkoutRes = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier: plan, trialDays: 14 }),
          });
          const checkoutData = await checkoutRes.json();
          if (checkoutRes.ok && checkoutData.url) {
            window.location.href = checkoutData.url;
            return;
          }
        } catch {}
        router.push("/pricing");
        router.refresh();
      } else {
        router.push(redirect ?? "/");
        router.refresh();
      }
    } catch {
      setError(t("auth.genericError"));
      setLoading(false);
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
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
          {t("auth.fullName")}
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("auth.namePlaceholder")}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </div>

      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-foreground mb-1">
          {t("auth.email")}
        </label>
        <input
          id="reg-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-foreground mb-1">
            {t("auth.password")}
          </label>
          <input
            id="reg-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.minPasswordPlaceholder")}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground mb-1">
            {t("auth.confirmPassword")}
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("auth.repeatPasswordPlaceholder")}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
          {t("auth.accountType")}
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        >
          <option value="PUBLIC">General User — browse knowledge base</option>
          <option value="PATIENT">Health Tracker — track my disease history</option>
          <option value="PRACTITIONER">TCM Practitioner — clinical tools + EMR</option>
          <option value="RESEARCHER">Researcher / Doctor — data access + evidence contribution</option>
        </select>
      </div>

      {role === "PATIENT" && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Free account — log symptoms, track conditions, take constitution assessment, and optionally contribute to research.
        </div>
      )}

      {role === "PRACTITIONER" && (
        <div>
          <label htmlFor="credentials" className="block text-sm font-medium text-foreground mb-1">
            {t("auth.practitionerCredentials")}{" "}
            <span className="text-muted font-normal">{t("auth.optional")}</span>
          </label>
          <input
            id="credentials"
            type="text"
            value={credentials}
            onChange={(e) => setCredentials(e.target.value)}
            placeholder={t("auth.credentialsPlaceholder")}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
      )}

      {role === "RESEARCHER" && (
        <div className="space-y-3">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            Researcher accounts are verified by our team. You will gain access to anonymised datasets, evidence contribution, and peer annotation tools.
          </div>
          <div>
            <label htmlFor="institution" className="block text-sm font-medium text-foreground mb-1">
              Institution / Affiliation <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              id="institution"
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Hong Kong Baptist University, CUHK..."
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
            />
          </div>
          <div>
            <label htmlFor="orcid" className="block text-sm font-medium text-foreground mb-1">
              ORCID iD <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              id="orcid"
              type="text"
              value={orcidId}
              onChange={(e) => setOrcidId(e.target.value)}
              placeholder="0000-0000-0000-0000"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
      </button>

      <p className="text-center text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href={plan ? `/login?callbackUrl=${encodeURIComponent(`/pricing?plan=${plan}`)}` : "/login"} className="text-primary font-medium hover:underline">
          {t("auth.submit")}
        </Link>
      </p>
    </form>
  );
}
