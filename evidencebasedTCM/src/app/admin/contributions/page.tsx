"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Contribution = {
  id: string;
  title: string;
  studyType: string;
  proposedGrade: string | null;
  status: string;
  createdAt: string;
  researcher: { institution: string | null; verificationStatus: string; user: { name: string | null; email: string } };
  doi: string | null;
  pmid: string | null;
  results: string;
  conclusions: string;
};

const STATUS_OPTIONS = ["PENDING", "REVIEWING", "ACCEPTED", "REJECTED"];

export default function AdminContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ status: "REVIEWING", reviewNotes: "" });
  const [saving, setSaving] = useState(false);

  const fetchContributions = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/contributions?status=${filter}`);
    if (res.ok) setContributions(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchContributions(); }, [fetchContributions]);

  const handleReview = async (id: string) => {
    setSaving(true);
    await fetch(`/api/admin/contributions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewForm),
    });
    setReviewing(null);
    setSaving(false);
    fetchContributions();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
          <h1 className="text-xl font-bold text-foreground mt-1">Evidence Contributions</h1>
        </div>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filter === s ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : contributions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted">No {filter.toLowerCase()} submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contributions.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-medium text-foreground">{c.title}</h3>
                    <span className="text-xs text-muted border border-border rounded px-1.5 py-0.5">{c.studyType.replace(/_/g, " ")}</span>
                    {c.proposedGrade && <span className="text-xs font-semibold text-primary">Grade {c.proposedGrade}</span>}
                  </div>
                  <p className="text-xs text-muted">
                    By <strong>{c.researcher.user.name ?? "Unknown"}</strong> ({c.researcher.user.email})
                    {c.researcher.institution && ` · ${c.researcher.institution}`}
                    {c.researcher.verificationStatus === "VERIFIED" && " · ✓ Verified"}
                    <span className="ml-2">{new Date(c.createdAt).toLocaleDateString("en-HK")}</span>
                  </p>
                  {(c.doi || c.pmid) && (
                    <p className="text-xs text-muted mt-1">
                      {c.doi && <span>DOI: {c.doi}</span>}
                      {c.doi && c.pmid && " · "}
                      {c.pmid && <span>PMID: {c.pmid}</span>}
                    </p>
                  )}

                  {reviewing === c.id ? (
                    <div className="mt-3 space-y-3">
                      <div className="text-sm">
                        <strong>Results:</strong>
                        <p className="text-muted mt-1 text-xs line-clamp-3">{c.results}</p>
                      </div>
                      <div className="text-sm">
                        <strong>Conclusions:</strong>
                        <p className="text-muted mt-1 text-xs line-clamp-3">{c.conclusions}</p>
                      </div>
                      <div className="flex gap-3">
                        <select value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                          <option value="REVIEWING">Reviewing</option>
                          <option value="ACCEPTED">Accept → Add to Evidence</option>
                          <option value="REJECTED">Reject</option>
                        </select>
                        <input value={reviewForm.reviewNotes} onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))}
                          placeholder="Review notes (optional)"
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleReview(c.id)} disabled={saving}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
                          {saving ? "Saving…" : "Submit Review"}
                        </button>
                        <button onClick={() => setReviewing(null)}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {reviewing !== c.id && (
                  <button onClick={() => { setReviewing(c.id); setReviewForm({ status: "REVIEWING", reviewNotes: "" }); }}
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-primary transition-colors">
                    Review
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
