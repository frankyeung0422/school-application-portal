"use client";

import { useState } from "react";
import Link from "next/link";

const STUDY_TYPES = [
  "SYSTEMATIC_REVIEW", "META_ANALYSIS", "RCT", "COHORT",
  "CASE_CONTROL", "CASE_SERIES", "CASE_REPORT", "EXPERT_OPINION", "TRADITIONAL_USE",
];
const GRADES = ["A", "B", "C", "D"];

export default function ContributePage() {
  const [form, setForm] = useState({
    title: "", authors: "", journal: "", year: "", doi: "", pmid: "",
    studyType: "RCT", pico: "", results: "", conclusions: "", proposedGrade: "C",
    relatedHerbs: "", relatedFormulas: "", relatedPatterns: "", relatedConditions: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.authors || !form.results || !form.conclusions) {
      setError("Title, authors, results, and conclusions are required"); return;
    }
    setSaving(true); setError("");
    const res = await fetch("/api/researcher/contributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        authors: form.authors,
        journal: form.journal || undefined,
        year: form.year ? Number(form.year) : undefined,
        doi: form.doi || undefined,
        pmid: form.pmid || undefined,
        studyType: form.studyType,
        pico: form.pico ? { raw: form.pico } : undefined,
        results: form.results,
        conclusions: form.conclusions,
        proposedGrade: form.proposedGrade || undefined,
        relatedHerbIds: [],
        relatedFormulaIds: [],
        relatedPatternIds: [],
        relatedConditionIds: [],
      }),
    });
    if (res.ok) {
      setSuccess(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "Submission failed. Ensure your researcher profile is complete.");
    }
    setSaving(false);
  };

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-foreground mb-2">Submission received!</h1>
        <p className="text-muted mb-6">Your evidence contribution has been sent for admin review. We will notify you when it&apos;s processed.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSuccess(false); setForm(f => ({ ...f, title: "", authors: "", results: "", conclusions: "" })); }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
            Submit another
          </button>
          <Link href="/researcher" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href="/researcher" className="text-sm text-muted hover:text-foreground">← Researcher Hub</Link>
        <h1 className="text-xl font-bold text-foreground mt-1">Submit Evidence</h1>
        <p className="text-sm text-muted mt-1">Contribute a published study for review. Our editorial team will assess it before adding to the evidence catalog.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Publication Details</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input value={form.title} onChange={e => update("title", e.target.value)}
              placeholder="Full publication title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Authors *</label>
            <input value={form.authors} onChange={e => update("authors", e.target.value)}
              placeholder="Last FM, Smith J, et al."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Journal <span className="text-muted font-normal">(optional)</span></label>
              <input value={form.journal} onChange={e => update("journal", e.target.value)}
                placeholder="e.g. Journal of Ethnopharmacology"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <input type="number" value={form.year} onChange={e => update("year", e.target.value)}
                placeholder="2024"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Study Type *</label>
              <select value={form.studyType} onChange={e => update("studyType", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                {STUDY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">DOI <span className="text-muted font-normal">(optional)</span></label>
              <input value={form.doi} onChange={e => update("doi", e.target.value)}
                placeholder="10.1016/j.xxx.2024.xxx"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PubMed ID <span className="text-muted font-normal">(optional)</span></label>
              <input value={form.pmid} onChange={e => update("pmid", e.target.value)}
                placeholder="e.g. 38012345"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Content</h2>
          <div>
            <label className="block text-sm font-medium mb-1">PICO / Study Description <span className="text-muted font-normal">(optional)</span></label>
            <textarea value={form.pico} onChange={e => update("pico", e.target.value)} rows={3}
              placeholder="Population, Intervention, Comparator, Outcome..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Results *</label>
            <textarea value={form.results} onChange={e => update("results", e.target.value)} rows={4}
              placeholder="Key quantitative and qualitative results..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Conclusions *</label>
            <textarea value={form.conclusions} onChange={e => update("conclusions", e.target.value)} rows={3}
              placeholder="Authors' conclusions and clinical implications..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium mb-1">Proposed GRADE</label>
            <select value={form.proposedGrade} onChange={e => update("proposedGrade", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
          {saving ? "Submitting…" : "Submit for Review"}
        </button>
      </form>
    </div>
  );
}
