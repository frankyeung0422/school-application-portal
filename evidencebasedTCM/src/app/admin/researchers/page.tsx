"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type ResearcherProfile = {
  id: string;
  institution: string | null;
  department: string | null;
  orcidId: string | null;
  researchAreas: string[];
  verificationStatus: string;
  createdAt: string;
  verifiedAt: string | null;
  user: { name: string | null; email: string; createdAt: string };
  _count: { contributions: number; annotations: number };
};

const STATUS_FILTERS = ["PENDING", "VERIFIED", "REJECTED", "ALL"];

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  VERIFIED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
};

export default function AdminResearchersPage() {
  const [profiles, setProfiles] = useState<ResearcherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/researchers?status=${filter}`);
    if (res.ok) setProfiles(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleDecision = async (id: string, verificationStatus: "VERIFIED" | "REJECTED") => {
    setSaving(true);
    await fetch(`/api/admin/researchers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationStatus }),
    });
    setReviewing(null);
    setSaving(false);
    fetchProfiles();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
          <h1 className="text-xl font-bold text-foreground mt-1">Researcher Verification</h1>
          <p className="text-sm text-muted mt-0.5">Review and verify researcher profile applications.</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filter === s ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted">No {filter === "ALL" ? "" : filter.toLowerCase() + " "}researcher profiles.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map(p => (
            <div key={p.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-foreground">{p.user.name ?? "Unknown"}</span>
                    <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${STATUS_BADGE[p.verificationStatus] ?? "bg-muted/20 text-muted border-border"}`}>
                      {p.verificationStatus}
                    </span>
                    <span className="text-xs text-muted">{p._count.contributions} contributions · {p._count.annotations} annotations</span>
                  </div>

                  {/* Contact */}
                  <p className="text-sm text-muted">{p.user.email}</p>

                  {/* Institution details */}
                  <div className="mt-2 space-y-0.5">
                    {p.institution && (
                      <p className="text-sm text-foreground">
                        🏛 {p.institution}{p.department && ` · ${p.department}`}
                      </p>
                    )}
                    {p.orcidId && (
                      <p className="text-sm text-muted">
                        ORCID: <a href={`https://orcid.org/${p.orcidId}`} target="_blank" rel="noopener noreferrer"
                          className="text-primary hover:underline">{p.orcidId}</a>
                      </p>
                    )}
                    {p.researchAreas.length > 0 && (
                      <p className="text-xs text-muted">Areas: {p.researchAreas.join(", ")}</p>
                    )}
                  </div>

                  <p className="text-xs text-muted mt-2">
                    Registered {new Date(p.user.createdAt).toLocaleDateString("en-HK")}
                    {" · "}Profile submitted {new Date(p.createdAt).toLocaleDateString("en-HK")}
                    {p.verifiedAt && ` · Verified ${new Date(p.verifiedAt).toLocaleDateString("en-HK")}`}
                  </p>

                  {reviewing === p.id && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleDecision(p.id, "VERIFIED")}
                        disabled={saving}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? "…" : "✓ Verify"}
                      </button>
                      <button
                        onClick={() => handleDecision(p.id, "REJECTED")}
                        disabled={saving}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? "…" : "✕ Reject"}
                      </button>
                      <button
                        onClick={() => setReviewing(null)}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {reviewing !== p.id && p.verificationStatus !== "VERIFIED" && (
                  <button
                    onClick={() => setReviewing(p.id)}
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-primary transition-colors"
                  >
                    Review
                  </button>
                )}
                {p.verificationStatus === "VERIFIED" && (
                  <button
                    onClick={() => setReviewing(p.id)}
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
