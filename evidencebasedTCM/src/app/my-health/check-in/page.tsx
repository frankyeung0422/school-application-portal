"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DOMAINS = [
  { key: "overallScore", label: "Overall Wellbeing", required: true, description: "How are you feeling overall today?" },
  { key: "energyScore", label: "Energy Level", required: false, description: "How much energy did you have?" },
  { key: "painScore", label: "Pain / Discomfort", required: false, description: "0 = no pain, 10 = worst imaginable" },
  { key: "sleepScore", label: "Sleep Quality", required: false, description: "How well did you sleep?" },
  { key: "stressScore", label: "Stress Level", required: false, description: "0 = calm, 10 = extremely stressed" },
  { key: "digestiveScore", label: "Digestive Health", required: false, description: "How is your digestion?" },
];

function ScoreSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-8 h-8 rounded-lg text-sm font-semibold border transition-colors ${
            value === n
              ? "bg-primary text-white border-primary"
              : "border-border bg-background text-muted hover:border-primary hover:text-primary"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function CheckInPage() {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number | null>>({
    overallScore: null, energyScore: null, painScore: null,
    sleepScore: null, stressScore: null, digestiveScore: null,
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scores.overallScore === null) { setError("Please set your overall wellbeing score"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/health-profile/check-ins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkInDate: new Date().toISOString(),
        overallScore: scores.overallScore,
        energyScore: scores.energyScore,
        painScore: scores.painScore,
        sleepScore: scores.sleepScore,
        stressScore: scores.stressScore,
        digestiveScore: scores.digestiveScore,
        notes: notes || undefined,
      }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
    setSaving(false);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-foreground mb-2">Check-in recorded!</h1>
        <p className="text-muted mb-6">Your health data has been saved. Keep it up — consistent tracking builds meaningful insights over time.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setDone(false); setScores({ overallScore: null, energyScore: null, painScore: null, sleepScore: null, stressScore: null, digestiveScore: null }); setNotes(""); }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
            Log again
          </button>
          <button onClick={() => router.push("/my-health/timeline")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
            View timeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/my-health" className="text-sm text-muted hover:text-foreground">← My Health</Link>
        <h1 className="text-xl font-bold text-foreground mt-1">Weekly Check-in</h1>
        <p className="text-sm text-muted mt-1">Rate each domain 0–10. Only Overall Wellbeing is required.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {DOMAINS.map(({ key, label, required, description }) => (
          <div key={key} className={`rounded-xl border p-4 ${required ? "border-primary/30 bg-primary/5" : "border-border bg-surface"}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{label} {required && <span className="text-red-500">*</span>}</h3>
                <p className="text-xs text-muted">{description}</p>
              </div>
              {scores[key] !== null && (
                <span className="text-2xl font-bold text-primary shrink-0">{scores[key]}</span>
              )}
            </div>
            <ScoreSelector value={scores[key]} onChange={(v) => setScores(s => ({ ...s, [key]: v }))} />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium mb-1">Notes <span className="text-muted font-normal">(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="What's affecting your health today? Any treatments tried?"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : "Submit Check-in"}
        </button>
      </form>
    </div>
  );
}
