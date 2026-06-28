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

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "活躍",
  MANAGED: "受控",
  RESOLVED: "已康復",
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
    if (!form.westernName.trim()) { setError("請填寫病況名稱"); return; }
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
      setError(d.error ?? "儲存失敗");
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
          <Link href="/my-health" className="text-sm text-muted hover:text-foreground">← 我的健康</Link>
          <h1 className="text-xl font-bold text-foreground mt-1">我的病況</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
        >
          ＋ 新增病況
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="font-semibold">新增病況</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">病況名稱 *</label>
              <input value={form.westernName} onChange={e => setForm(f => ({ ...f, westernName: e.target.value }))}
                placeholder="如：高血壓、失眠……"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ICD-10 代碼 <span className="text-muted font-normal">（選填）</span></label>
              <input value={form.icd10Code} onChange={e => setForm(f => ({ ...f, icd10Code: e.target.value }))}
                placeholder="如：I10"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">中醫證型 <span className="text-muted font-normal">（選填）</span></label>
              <input value={form.tcmPatternFree} onChange={e => setForm(f => ({ ...f, tcmPatternFree: e.target.value }))}
                placeholder="如：肝陽上亢、腎陰虛……"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">開始日期 <span className="text-muted font-normal">（選填）</span></label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">嚴重程度 1–5 <span className="text-muted font-normal">（選填）</span></label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">——未設定——</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">備注 <span className="text-muted font-normal">（選填）</span></label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="其他補充資料……"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {saving ? "儲存中……" : "儲存"}
            </button>
            <button type="button" onClick={() => setAdding(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
              取消
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-muted text-sm">載入中……</p>
      ) : active.length === 0 && resolved.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted">尚未記錄任何病況。</p>
          <p className="text-sm text-muted mt-1">新增您正在管理或曾患的病況。</p>
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
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[c.status] ?? ""}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
                    {c.severity && <span className="text-xs text-muted">嚴重程度 {c.severity}/5</span>}
                  </div>
                  {c.tcmPatternFree && <p className="text-sm text-muted mt-1">中醫證型：{c.tcmPatternFree}</p>}
                  {c.notes && <p className="text-sm text-muted mt-1">{c.notes}</p>}
                  {c.startDate && <p className="text-xs text-muted mt-1">始於 {new Date(c.startDate).toLocaleDateString("zh-HK")}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => updateStatus(c.id, c.status === "ACTIVE" ? "MANAGED" : "ACTIVE")}
                    className="text-xs rounded border border-border px-2 py-1 text-muted hover:text-foreground transition-colors">
                    {c.status === "ACTIVE" ? "標記為受控" : "標記為活躍"}
                  </button>
                  <button onClick={() => updateStatus(c.id, "RESOLVED")}
                    className="text-xs rounded border border-green-300 px-2 py-1 text-green-700 hover:bg-green-50 transition-colors">
                    已康復
                  </button>
                </div>
              </div>
            </div>
          ))}

          {resolved.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted hover:text-foreground">
                {resolved.length} 個已康復病況
              </summary>
              <div className="mt-2 space-y-2">
                {resolved.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-2 opacity-60">
                    <div>
                      <span className="text-sm font-medium">{c.westernName}</span>
                      {c.endDate && <span className="text-xs text-muted ml-2">康復於 {new Date(c.endDate).toLocaleDateString("zh-HK")}</span>}
                    </div>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
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
