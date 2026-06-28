import { auth } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { tierFromRole, tierAtLeast } from "@/lib/auth/tier";
import { buildRWESummary } from "@/lib/rwe/aggregate";
import { ProGate } from "@/components/shared/ProGate";
import Link from "next/link";

export const metadata = { title: "真實世界療效排行 — EBTCM" };

function ResponderBar({ rate, max }: { rate: number | null; max: number }) {
  if (rate === null) return <span className="text-xs text-muted">—</span>;
  const pct = max > 0 ? (rate / max) * 100 : 0;
  const color = rate >= 70 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-12 text-right">{rate}%</span>
    </div>
  );
}

export default async function BenchmarkingPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const tier = tierFromRole(role);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link href="/research" className="text-sm text-muted hover:text-foreground">← 研究中心</Link>
        <h1 className="text-2xl font-bold mt-1">真實世界療效排行</h1>
        <p className="text-sm text-muted mt-1">
          彙整平台所有診所的門診結果（症狀量表 0–10，前後配對），以匿名化方式比較各方劑的有效率。診所版用戶可查看完整排行及體徵趨勢。
        </p>
      </div>

      <ProGate
        need="clinic"
        feature="真實世界療效排行（診所版功能）"
        description="升級至診所版，即可查看所有方劑的匿名化有效率排行、與平台平均值的比較，以及體徵改善趨勢，協助您優化臨床選方決策。"
      >
        <BenchmarkingContent />
      </ProGate>
    </div>
  );
}

async function BenchmarkingContent() {
  const summary = await buildRWESummary(false);

  const formulasWithData = summary.formulas.filter((f) => f.stats.n >= 1);
  const patternsWithData = summary.patterns.filter((p) => p.stats.n >= 1);

  const maxRate = Math.max(
    ...formulasWithData.map((f) => f.stats.responderRate ?? 0),
    1,
  );

  const platformAvgRate = summary.overall.responderRate;
  const platformAvgDelta = summary.overall.meanDelta;

  return (
    <div className="space-y-8">
      {/* Platform stats summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "總就診數", value: summary.totalConsultations },
          { label: "有前後配對", value: summary.pairedConsultations },
          { label: "平均有效率", value: platformAvgRate != null ? `${platformAvgRate}%` : "—" },
          { label: "平均改善 Δ", value: platformAvgDelta != null ? `▼${platformAvgDelta}` : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4 text-center">
            <div className="text-xl font-bold tabular-nums">{s.value}</div>
            <div className="text-xs text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {formulasWithData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted">尚無配對療效數據。</p>
          <p className="text-sm text-muted mt-1">在處方紀錄中記錄患者就診前後的症狀評分（0–10），系統即可自動彙整有效率。</p>
          <Link href="/cases" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
            前往病例管理 →
          </Link>
        </div>
      ) : (
        <>
          {/* Formula ranking */}
          <div>
            <h2 className="text-lg font-semibold mb-3">方劑有效率排行</h2>
            <p className="text-xs text-muted mb-3">有效率 = 症狀改善 ≥ 2 分（0–10 量表）的就診比例</p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold text-muted">#</th>
                    <th className="py-3 px-4 text-left font-semibold">方劑</th>
                    <th className="py-3 px-4 text-left font-semibold">就診數</th>
                    <th className="py-3 px-4 text-left font-semibold">平均改善</th>
                    <th className="py-3 px-4 text-left font-semibold w-40">有效率</th>
                    <th className="py-3 px-4 text-left font-semibold">vs 平台均值</th>
                  </tr>
                </thead>
                <tbody>
                  {formulasWithData.slice(0, 20).map((f, idx) => {
                    const diff = f.stats.responderRate != null && platformAvgRate != null
                      ? Math.round((f.stats.responderRate - platformAvgRate) * 10) / 10
                      : null;
                    return (
                      <tr key={f.formulaId} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4 text-muted">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <Link href={`/formulas/${f.formulaId}`} className="font-medium text-primary hover:underline">
                            {f.chineseName}
                          </Link>
                          <span className="text-xs text-muted ml-1">{f.pinyinName}</span>
                        </td>
                        <td className="py-3 px-4 tabular-nums">{f.stats.n}</td>
                        <td className="py-3 px-4 tabular-nums">
                          {f.stats.meanDelta != null ? (
                            <span className="text-emerald-700 font-medium">▼{f.stats.meanDelta}</span>
                          ) : "—"}
                        </td>
                        <td className="py-3 px-4 w-40">
                          <ResponderBar rate={f.stats.responderRate} max={maxRate} />
                        </td>
                        <td className="py-3 px-4 tabular-nums text-xs">
                          {diff != null ? (
                            <span className={diff >= 0 ? "text-emerald-700 font-medium" : "text-red-600"}>
                              {diff >= 0 ? "+" : ""}{diff}%
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pattern ranking */}
          {patternsWithData.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">證型有效率排行</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface border-b border-border">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">#</th>
                      <th className="py-3 px-4 text-left font-semibold">證型</th>
                      <th className="py-3 px-4 text-left font-semibold">就診數</th>
                      <th className="py-3 px-4 text-left font-semibold w-40">有效率</th>
                      <th className="py-3 px-4 text-left font-semibold">常用方劑</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patternsWithData.slice(0, 10).map((p, idx) => (
                      <tr key={p.patternId} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4 text-muted">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <Link href={`/patterns/${p.patternId}`} className="font-medium text-primary hover:underline">
                            {p.chineseName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 tabular-nums">{p.stats.n}</td>
                        <td className="py-3 px-4 w-40">
                          <ResponderBar rate={p.stats.responderRate} max={maxRate} />
                        </td>
                        <td className="py-3 px-4 text-xs text-muted">
                          {p.topFormulas.slice(0, 3).map((f) => f.name).join("、") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-muted border-t border-border pt-3">
            數據來自所有診所的匿名化門診記錄，有效率基於症狀量表前後配對（n = 配對就診數）。僅顯示 n ≥ 1 的方劑／證型。
          </p>
        </>
      )}
    </div>
  );
}
