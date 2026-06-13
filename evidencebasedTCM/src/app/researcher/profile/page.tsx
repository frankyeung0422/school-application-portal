"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ResearcherProfilePage() {
  const [form, setForm] = useState({ institution: "", department: "", orcidId: "", researchAreas: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [annotationCount, setAnnotationCount] = useState(0);
  const [contributionCount, setContributionCount] = useState(0);

  useEffect(() => {
    fetch("/api/researcher/profile")
      .then(r => r.json())
      .then(d => {
        if (d) {
          setForm({
            institution: d.institution ?? "",
            department: d.department ?? "",
            orcidId: d.orcidId ?? "",
            researchAreas: (d.researchAreas ?? []).join(", "),
          });
          setVerificationStatus(d.verificationStatus);
          setAnnotationCount(d._count?.annotations ?? 0);
          setContributionCount(d._count?.contributions ?? 0);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    const res = await fetch("/api/researcher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institution: form.institution || undefined,
        department: form.department || undefined,
        orcidId: form.orcidId || undefined,
        researchAreas: form.researchAreas ? form.researchAreas.split(",").map(s => s.trim()).filter(Boolean) : [],
      }),
    });
    if (res.ok) {
      setSaved(true);
      const d = await res.json();
      setVerificationStatus(d.verificationStatus);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
    setSaving(false);
  };

  const statusBadge = {
    PENDING: "bg-amber-100 text-amber-700",
    VERIFIED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  }[verificationStatus ?? "PENDING"] ?? "bg-muted/20 text-muted";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/researcher" className="text-sm text-muted hover:text-foreground">← Researcher Hub</Link>
        <h1 className="text-xl font-bold text-foreground mt-1">Researcher Profile</h1>
      </div>

      {verificationStatus && (
        <div className="flex items-center gap-2 mb-6">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge}`}>
            {verificationStatus === "VERIFIED" ? "✓ Verified Researcher" : verificationStatus === "PENDING" ? "⏳ Pending Verification" : "✕ Verification Rejected"}
          </span>
          <span className="text-xs text-muted">{contributionCount} contributions · {annotationCount} annotations</span>
        </div>
      )}

      {verificationStatus === "PENDING" && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Our team verifies researcher accounts within 2-3 business days. Complete your profile below to speed up review.
        </div>
      )}

      {loading ? <p className="text-muted text-sm">Loading…</p> : (
        <form onSubmit={handleSave} className="rounded-xl border border-border bg-surface p-6 space-y-5">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Institution</label>
              <input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
                placeholder="University / Hospital / Organisation"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department <span className="text-muted font-normal">(optional)</span></label>
              <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                placeholder="e.g. School of Chinese Medicine"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ORCID iD <span className="text-muted font-normal">(optional)</span></label>
              <input value={form.orcidId} onChange={e => setForm(f => ({ ...f, orcidId: e.target.value }))}
                placeholder="0000-0000-0000-0000"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Research Areas <span className="text-muted font-normal">(comma-separated)</span></label>
              <input value={form.researchAreas} onChange={e => setForm(f => ({ ...f, researchAreas: e.target.value }))}
                placeholder="e.g. Cardiovascular, Pain Management, Oncology..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save Profile"}
            </button>
            {saved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </form>
      )}

      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="space-y-2">
          {[
            { href: "/researcher/contribute", label: "Submit new evidence" },
            { href: "/researcher/export", label: "Download datasets" },
            { href: "/evidence", label: "Browse & annotate evidence" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-muted hover:text-foreground hover:border-primary transition-colors">
              <span>→</span> {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
