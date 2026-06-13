"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type SymptomEntry = { name: string; severity: number; tcmTag?: string };
type SymptomLog = {
  id: string;
  logDate: string;
  symptoms: string;
  tongueNotes: string | null;
  energyLevel: number | null;
  sleepQuality: number | null;
  stressLevel: number | null;
  notes: string | null;
};

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const color = value >= 7 ? "bg-green-500" : value >= 4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-xs text-muted w-4">{value}</span>
    </div>
  );
}

export default function SymptomsPage() {
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([{ name: "", severity: 5 }]);
  const [form, setForm] = useState({ logDate: new Date().toISOString().slice(0,10), tongueNotes: "", energyLevel: "", sleepQuality: "", stressLevel: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/health-profile/symptom-logs");
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }, []);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const addSymptom = () => setSymptoms(s => [...s, { name: "", severity: 5 }]);
  const removeSymptom = (i: number) => setSymptoms(s => s.filter((_, idx) => idx !== i));
  const updateSymptom = (i: number, field: keyof SymptomEntry, value: string | number) =>
    setSymptoms(s => s.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validSymptoms = symptoms.filter(s => s.name.trim());
    if (!validSymptoms.length) { setError("Add at least one symptom"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/health-profile/symptom-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logDate: form.logDate,
        symptoms: validSymptoms,
        tongueNotes: form.tongueNotes || undefined,
        energyLevel: form.energyLevel ? Number(form.energyLevel) : undefined,
        sleepQuality: form.sleepQuality ? Number(form.sleepQuality) : undefined,
        stressLevel: form.stressLevel ? Number(form.stressLevel) : undefined,
        notes: form.notes || undefined,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setSymptoms([{ name: "", severity: 5 }]);
      setForm({ logDate: new Date().toISOString().slice(0,10), tongueNotes: "", energyLevel: "", sleepQuality: "", stressLevel: "", notes: "" });
      fetchLogs();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/my-health" className="text-sm text-muted hover:text-foreground">← My Health</Link>
          <h1 className="text-xl font-bold text-foreground mt-1">Symptom Diary</h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
          + Log Symptoms
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-6 rounded-xl border border-border bg-surface p-5 space-y-5">
          <h2 className="font-semibold">New Symptom Log</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input type="date" value={form.logDate} onChange={e => setForm(f => ({ ...f, logDate: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Symptoms *</label>
              <button type="button" onClick={addSymptom} className="text-xs text-primary hover:underline">+ Add</button>
            </div>
            {symptoms.map((s, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={s.name} onChange={e => updateSymptom(i, "name", e.target.value)}
                  placeholder="Symptom name (e.g. headache, fatigue)"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted">Severity</span>
                  <select value={s.severity} onChange={e => updateSymptom(i, "severity", Number(e.target.value))}
                    className="rounded border border-border bg-background px-2 py-2 text-sm">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {symptoms.length > 1 && (
                  <button type="button" onClick={() => removeSymptom(i)}
                    className="text-red-400 hover:text-red-600 px-1">✕</button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Energy 1–10", key: "energyLevel" },
              { label: "Sleep 1–10", key: "sleepQuality" },
              { label: "Stress 1–10", key: "stressLevel" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1">{label}</label>
                <select value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm">
                  <option value="">—</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tongue observations <span className="text-muted font-normal">(optional)</span></label>
            <input value={form.tongueNotes} onChange={e => setForm(f => ({ ...f, tongueNotes: e.target.value }))}
              placeholder="e.g. pale, red tip, thick white coat..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes <span className="text-muted font-normal">(optional)</span></label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="What might have triggered this? What helped?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save Log"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted">No symptom logs yet.</p>
          <p className="text-sm text-muted mt-1">Start logging how you feel each day to track patterns over time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const parsedSymptoms: SymptomEntry[] = (() => { try { return JSON.parse(log.symptoms); } catch { return []; } })();
            return (
              <div key={log.id} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-medium text-foreground mb-2">
                  {new Date(log.logDate).toLocaleDateString("en-HK", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {parsedSymptoms.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs">
                      {s.name}
                      <span className="font-semibold text-primary">{s.severity}/10</span>
                    </span>
                  ))}
                </div>
                <div className="space-y-1">
                  <ScoreBar label="Energy" value={log.energyLevel} />
                  <ScoreBar label="Sleep" value={log.sleepQuality} />
                  <ScoreBar label="Stress" value={log.stressLevel} />
                </div>
                {log.tongueNotes && <p className="text-xs text-muted mt-2">Tongue: {log.tongueNotes}</p>}
                {log.notes && <p className="text-xs text-muted mt-1">{log.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
