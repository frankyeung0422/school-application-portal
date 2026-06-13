"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Condition = {
  id: string;
  westernName: string;
  icd10Code: string | null;
  tcmPatternFree: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  severity: number | null;
  notes: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-red-100 text-red-700",
  MANAGED: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
};

export default function ConditionsPage() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ westernName: "", icd10Code: "", tcmPatternFree: "", startDate: "", severity: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchConditions = useCallback(async () => {
    const res = await fetch("/api/health-profile/conditions");
    if (res.ok) setConditions(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchConditions(); }, [fetchConditions]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.westernName.trim()) { setError("Condition name required"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/health-profile/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        westernName: form.westernName,
        icd10Code: form.icd10Code || undefined,
        tcmPatternFree: form.tcmPatternFree || undefined,
        startDate: form.startDate || undefined,
        severity: form.severity ? Number(form.severity) : undefined,
        notes: form.notes || undefined,
      }),
    });
    if (res.ok) {
      setForm({ westernName: "", icd10Code: "", tcmPatternFree: "", startDate: "", severity: "", notes: "" });
      setAdding(false);
      fetchConditions();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/health-profile/conditions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(status === "RESOLVED" && { endDate: new Date().toISOString() }) }),
    });
    fetchConditions();
  };

  const active = conditions.filter((c) => c.status !== "RESOLVED");
  const resolved = conditions.filter((c) => c.status === "RESOLVED");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/my-health" className="text-sm text-muted hover:text-foreground">← My Health</Link>
          <h1 className="text-xl font-bold text-foreground mt-1">My Conditions</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
        >
          + Add Condition
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="font-semibold">New Condition</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Condition name *</label>
              <input value={form.westernName} onChange={e => setForm(f => ({ ...f, westernName: e.target.value }))}
                placeholder="e.g. Hypertension, Insomnia..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ICD-10 Code <span className="text-muted font-normal">(optional)</span></label>
              <input value={form.icd10Code} onChange={e => setForm(f => ({ ...f, icd10Code: e.target.value }))}
                placeholder="e.g. I10"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">TCM Pattern <span className="text-muted font-normal">(optional)</span></label>
              <input value={form.tcmPatternFree} onChange={e => setForm(f => ({ ...f, tcmPatternFree: e.target.value }))}
                placeholder="e.g. 肝陽上亢, Kidney Yin Deficiency..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start date <span className="text-muted font-normal">(optional)</span></label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Severity 1–5 <span className="text-muted font-normal">(optional)</span></label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">— not set —</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes <span className="text-muted font-normal">(optional)</span></label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Any additional details..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setAdding(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : active.length === 0 && resolved.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted">No conditions recorded yet.</p>
          <p className="text-sm text-muted mt-1">Add conditions you are currently managing or have had in the past.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground">{c.westernName}</h3>
                    {c.icd10Code && <span className="text-xs text-muted bg-background border border-border rounded px-1.5 py-0.5">{c.icd10Code}</span>}
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[c.status] ?? ""}`}>{c.status}</span>
                    {c.severity && <span className="text-xs text-muted">Severity {c.severity}/5</span>}
                  </div>
                  {c.tcmPatternFree && <p className="text-sm text-muted mt-1">TCM pattern: {c.tcmPatternFree}</p>}
                  {c.notes && <p className="text-sm text-muted mt-1">{c.notes}</p>}
                  {c.startDate && <p className="text-xs text-muted mt-1">Since {new Date(c.startDate).toLocaleDateString("en-HK")}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => updateStatus(c.id, c.status === "ACTIVE" ? "MANAGED" : "ACTIVE")}
                    className="text-xs rounded border border-border px-2 py-1 text-muted hover:text-foreground transition-colors">
                    {c.status === "ACTIVE" ? "Mark Managed" : "Mark Active"}
                  </button>
                  <button onClick={() => updateStatus(c.id, "RESOLVED")}
                    className="text-xs rounded border border-green-300 px-2 py-1 text-green-700 hover:bg-green-50 transition-colors">
                    Resolved
                  </button>
                </div>
              </div>
            </div>
          ))}

          {resolved.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted hover:text-foreground">
                {resolved.length} resolved condition{resolved.length !== 1 ? "s" : ""}
              </summary>
              <div className="mt-2 space-y-2">
                {resolved.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-2 opacity-60">
                    <div>
                      <span className="text-sm font-medium">{c.westernName}</span>
                      {c.endDate && <span className="text-xs text-muted ml-2">resolved {new Date(c.endDate).toLocaleDateString("en-HK")}</span>}
                    </div>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
