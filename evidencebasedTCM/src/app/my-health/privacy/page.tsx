"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PrivacyPage() {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/health-profile")
      .then(r => r.json())
      .then(d => { setConsent(d.researchConsent ?? false); setLoading(false); });
  }, []);

  const handleSave = async (newConsent: boolean) => {
    setSaving(true); setSaved(false);
    await fetch("/api/health-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ researchConsent: newConsent }),
    });
    setConsent(newConsent);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/my-health" className="text-sm text-muted hover:text-foreground">← My Health</Link>
        <h1 className="text-xl font-bold text-foreground mt-1">Profile & Privacy</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-foreground mb-2">Research Data Consent</h2>
          <p className="text-sm text-muted mb-4">
            When enabled, your anonymised health data (check-in scores, condition categories, constitution type) is included in aggregated datasets accessible to verified researchers on this platform. Your personal details are never shared — only statistical patterns.
          </p>

          <ul className="text-sm text-muted space-y-2 mb-5">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Only aggregated, anonymised data is shared</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Your name and email are never disclosed</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Date of birth is replaced with age decade (e.g. "40s")</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>You can opt out at any time</li>
          </ul>

          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleSave(!consent)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${consent ? "bg-primary" : "bg-border"} disabled:opacity-50`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${consent ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-sm font-medium text-foreground">
                {consent ? "Contributing to research (opt-in active)" : "Not contributing to research"}
              </span>
            </div>
          )}
          {saved && <p className="text-sm text-green-600 mt-2">Preference saved.</p>}
        </div>

        <hr className="border-border" />

        <div>
          <h2 className="font-semibold text-foreground mb-2">What data we collect</h2>
          <ul className="text-sm text-muted space-y-1">
            <li>• Weekly check-in scores (overall, energy, sleep, pain, stress, digestion)</li>
            <li>• Symptom log entries (symptom names and severity ratings)</li>
            <li>• Active condition categories (condition name, TCM pattern)</li>
            <li>• Constitution type results (anonymised)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
