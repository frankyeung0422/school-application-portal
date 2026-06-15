import Link from "next/link";
import { buildRWESummary, type OutcomeStats } from "@/lib/rwe/aggregate";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

const SMALL_N = 10; // below this, flag as small-sample

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-muted">—</span>;
  const good = delta > 0;
  return (
    <span className={good ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
      {good ? "▼" : "▲"} {Math.abs(delta).toFixed(1)}
    </span>
  );
}

function StatCells({ stats, S }: { stats: OutcomeStats; S: (zh: string, en: string) => string }) {
  return (
    <>
      <td className="px-3 py-2 text-center tabular-nums">{stats.n}</td>
      <td className="px-3 py-2 text-center tabular-nums text-muted">
        {stats.meanBefore != null ? `${stats.meanBefore} → ${stats.meanAfter}` : "—"}
      </td>
      <td className="px-3 py-2 text-center tabular-nums">
        <DeltaBadge delta={stats.meanDelta} />
      </td>
      <td className="px-3 py-2 text-center tabular-nums">
        {stats.responderRate != null ? (
          <span className={stats.responderRate >= 60 ? "text-emerald-700 font-medium" : "text-foreground"}>
            {stats.responderRate}%
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-2 text-center tabular-nums">
        <span className={stats.adverseRate > 8 ? "text-red-700 font-medium" : "text-muted"}>
          {stats.adverseRate}%
        </span>
      </td>
    </>
  );
}

export default async function RWEDashboardPage() {
  const locale = await getLocale();
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);
  const data = await buildRWESummary();

  const hasData = data.totalConsultations > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <nav className="text-sm text-muted">
        <Link href="/research" className="hover:text-primary">
          {S("創新治療研究", "Innovation Research")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{S("真實世界證據", "Real-World Evidence")}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold">{S("真實世界證據儀表板", "Real-World Evidence Dashboard")}</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-3xl">
          {S(
            "彙整本平台門診紀錄中的實際療效資料，作為隨機對照試驗（RCT）的補充。主要指標為每次就診的 0–10 症狀視覺類比量表（治療前後配對），並追蹤不良反應發生率與生理指標（HbA1c、血壓、BMI）的縱向變化。",
            "Aggregates routine-practice outcomes from this platform's consultation records as a complement to RCTs. Primary outcome is the paired 0–10 symptom VAS per visit; we also track adverse-event rate and longitudinal vital-sign change (HbA1c, BP, BMI).",
          )}
        </p>
      </header>

      {/* Demo-data disclaimer */}
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
        {S(
          "⚠ 目前顯示的為標記【示範】的合成資料，用於展示分析方法；接入真實門診紀錄後即反映實際療效。",
          "⚠ Showing synthetic data marked 【示範】 to demonstrate the methodology; figures reflect real outcomes once actual consultation records accrue.",
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-muted">
          {S(
            "尚無門診紀錄可供彙整。可執行 scripts/seed-rwe-demo.ts --apply 載入示範資料。",
            "No consultation records to aggregate yet. Run scripts/seed-rwe-demo.ts --apply to load demo data.",
          )}
        </p>
      ) : (
        <>
          {/* Summary cards */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: S("病人數", "Patients"), value: data.totalPatients },
              { label: S("就診次數", "Consultations"), value: data.totalConsultations },
              { label: S("平均症狀改善 (Δ)", "Mean symptom Δ"), value: data.overall.meanDelta ?? "—" },
              { label: S("總體有效率", "Overall responder rate"), value: data.overall.responderRate != null ? `${data.overall.responderRate}%` : "—" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
                <div className="text-2xl font-bold tabular-nums">{c.value}</div>
                <div className="text-xs text-muted mt-1">{c.label}</div>
              </div>
            ))}
          </section>

          {/* By formula */}
          <section>
            <h2 className="text-xl font-bold mb-1">{S("依方劑分析療效", "Effectiveness by Formula")}</h2>
            <p className="text-xs text-muted mb-3">
              {S(
                "有效率＝症狀量表改善 ≥2 分的就診比例。Δ 為治療前後平均差（▼ 表示症狀下降＝改善）。",
                "Responder = visits with ≥2-point VAS improvement. Δ is mean before−after (▼ = symptom decrease = improvement).",
              )}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">{S("方劑", "Formula")}</th>
                    <th className="px-3 py-2 text-center">n</th>
                    <th className="px-3 py-2 text-center">{S("前→後", "Before→After")}</th>
                    <th className="px-3 py-2 text-center">Δ</th>
                    <th className="px-3 py-2 text-center">{S("有效率", "Responder")}</th>
                    <th className="px-3 py-2 text-center">{S("不良反應", "Adverse")}</th>
                    <th className="px-3 py-2 text-left">{S("生理指標變化 / 常見證型", "Vital Δ / top patterns")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.formulas.map((f) => (
                    <tr key={f.formulaId} className="hover:bg-surface/50">
                      <td className="px-3 py-2">
                        <Link href={`/formulas/${f.formulaId}`} className="font-medium hover:text-primary">
                          {f.chineseName}
                        </Link>
                        {f.stats.n < SMALL_N && (
                          <span className="ml-2 rounded bg-muted/15 px-1.5 py-0.5 text-xs text-muted">
                            {S("小樣本", "small n")}
                          </span>
                        )}
                      </td>
                      <StatCells stats={f.stats} S={S} />
                      <td className="px-3 py-2 text-xs text-muted">
                        {f.vitals.length > 0 ? (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {f.vitals.map((v) => (
                              <span key={v.label}>
                                {v.label}:{" "}
                                <span className={v.meanDelta < 0 ? "text-emerald-700" : "text-amber-700"}>
                                  {v.meanBaseline}→{v.meanLatest} {v.unit} ({v.meanDelta > 0 ? "+" : ""}{v.meanDelta})
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span>{f.topPatterns.map((p) => `${p.name}(${p.count})`).join("、") || "—"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* By pattern */}
          <section>
            <h2 className="text-xl font-bold mb-3">{S("依證型分析療效", "Effectiveness by Pattern")}</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">{S("證型", "Pattern")}</th>
                    <th className="px-3 py-2 text-center">n</th>
                    <th className="px-3 py-2 text-center">{S("前→後", "Before→After")}</th>
                    <th className="px-3 py-2 text-center">Δ</th>
                    <th className="px-3 py-2 text-center">{S("有效率", "Responder")}</th>
                    <th className="px-3 py-2 text-center">{S("不良反應", "Adverse")}</th>
                    <th className="px-3 py-2 text-left">{S("常用方劑", "Top formulas")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.patterns.map((p) => (
                    <tr key={p.patternId} className="hover:bg-surface/50">
                      <td className="px-3 py-2">
                        <Link href={`/patterns/${p.patternId}`} className="font-medium hover:text-primary">
                          {p.chineseName}
                        </Link>
                        <span className="ml-2 text-xs text-muted">{p.pathologyType}</span>
                      </td>
                      <StatCells stats={p.stats} S={S} />
                      <td className="px-3 py-2 text-xs text-muted">
                        {p.topFormulas.map((x) => `${x.name}(${x.count})`).join("、") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="text-xs text-muted border-t border-border pt-4">
            {S(
              "真實世界證據反映常規臨床實踐，存在選擇偏倚與混雜因素，不能取代隨機對照試驗；應與 GRADE 實證分級互為補充。",
              "Real-world evidence reflects routine practice and is subject to selection bias and confounding; it complements rather than replaces RCTs and GRADE-rated evidence.",
            )}
          </footer>
        </>
      )}
    </div>
  );
}
