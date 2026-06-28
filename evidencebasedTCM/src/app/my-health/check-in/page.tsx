"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DOMAINS = [
  { key: "overallScore", label: "整體健康", required: true, description: "今天整體感覺如何？" },
  { key: "energyScore", label: "精力水平", required: false, description: "今天精力如何？" },
  { key: "painScore", label: "疼痛／不適", required: false, description: "0 = 無痛，10 = 最劇烈" },
  { key: "sleepScore", label: "睡眠質素", required: false, description: "昨晚睡得如何？" },
  { key: "stressScore", label: "壓力水平", required: false, description: "0 = 平靜，10 = 極度緊張" },
  { key: "digestiveScore", label: "消化健康", required: false, description: "消化情況如何？" },
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
    if (scores.overallScore === null) { setError("請為整體健康評分"); return; }
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
      setError(d.error ?? "儲存失敗");
    }
    setSaving(false);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-foreground mb-2">評估已記錄！</h1>
        <p className="text-muted mb-6">您的健康數據已儲存。堅持記錄，將建立有意義的健康洞察。</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setDone(false); setScores({ overallScore: null, energyScore: null, painScore: null, sleepScore: null, stressScore: null, digestiveScore: null }); setNotes(""); }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
            再次記錄
          </button>
          <button onClick={() => router.push("/my-health/timeline")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
            查看時間軸
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/my-health" className="text-sm text-muted hover:text-foreground">← 我的健康</Link>
        <h1 className="text-xl font-bold text-foreground mt-1">每週健康評估</h1>
        <p className="text-sm text-muted mt-1">各項目評分 0–10，僅「整體健康」為必填。</p>
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
          <label className="block text-sm font-medium mb-1">備注 <span className="text-muted font-normal">（選填）</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="今天有什麼影響健康的事？曾嘗試任何療法嗎？"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
          {saving ? "儲存中……" : "提交評估"}
        </button>
      </form>
    </div>
  );
}
