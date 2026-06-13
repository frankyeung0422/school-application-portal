import Link from "next/link";
import { buildBenchmark } from "@/lib/research/benchmark";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

function aucClass(auc: number | null): string {
  if (auc == null) return "text-muted";
  if (auc >= 0.7) return "text-emerald-700 font-semibold";
  if (auc > 0.5) return "text-lime-700 font-medium";
  return "text-amber-700";
}

export default async function ValidationPage() {
  const locale = await getLocale();
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);
  const b = await buildBenchmark();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <nav className="text-sm text-muted">
        <Link href="/research" className="hover:text-primary">{S("創新治療研究", "Innovation Research")}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{S("引擎驗證", "Engine Validation")}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold">{S("網絡藥理引擎驗證", "Network-Pharmacology Engine Validation")}</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-3xl">
          {S(
            "檢驗「靶點重疊」預測是否能將已知有實證支持的中藥排在前面。以資料庫中與該疾病相關的實證連結作為金標準，計算排序品質（ROC-AUC）、前 5/10 名命中率與富集倍數。ROC-AUC > 0.5 即優於隨機。",
            "Tests whether the target-overlap predictions rank already evidence-backed herbs near the top. Uses disease-matched evidence links as the gold standard and reports ranking quality (ROC-AUC), precision@5/@10, and enrichment. ROC-AUC > 0.5 beats random.",
          )}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: S("平均 ROC-AUC", "Mean ROC-AUC"), value: b.overall.meanAuc ?? "—", hi: (b.overall.meanAuc ?? 0) > 0.5 },
          { label: S("平均前5命中", "Mean P@5"), value: b.overall.meanP5 },
          { label: S("平均前10命中", "Mean P@10"), value: b.overall.meanP10 },
          { label: S("已評估疾病", "Diseases evaluated"), value: b.overall.diseasesEvaluated },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
            <div className={`text-2xl font-bold tabular-nums ${"hi" in c && c.hi ? "text-emerald-700" : ""}`}>{c.value}</div>
            <div className="text-xs text-muted mt-1">{c.label}</div>
          </div>
        ))}
      </section>

      {b.overall.meanAuc != null && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-800">
          {S(
            `平均 ROC-AUC ${b.overall.meanAuc} —— 引擎將已知有效中藥排序於前的能力${b.overall.meanAuc > 0.5 ? "顯著優於隨機（0.5）" : "未優於隨機"}。`,
            `Mean ROC-AUC ${b.overall.meanAuc} — the engine ranks known-effective herbs ${b.overall.meanAuc > 0.5 ? "meaningfully better than chance (0.5)" : "no better than chance"}.`,
          )}
        </p>
      )}

      <section>
        <h2 className="text-xl font-bold mb-3">{S("各疾病排序品質", "Per-Disease Ranking Quality")}</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left">{S("疾病", "Disease")}</th>
                <th className="px-3 py-2 text-center">ROC-AUC</th>
                <th className="px-3 py-2 text-center">P@5</th>
                <th className="px-3 py-2 text-center">P@10</th>
                <th className="px-3 py-2 text-center">{S("金標準/可評", "Gold/Universe")}</th>
                <th className="px-3 py-2 text-center">{S("富集倍數", "Enrichment")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {b.perDisease.map((d) => (
                <tr key={d.diseaseId} className="hover:bg-surface/50">
                  <td className="px-3 py-2">
                    <Link href={`/research/${d.diseaseId}`} className="font-medium hover:text-primary">{d.diseaseName}</Link>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${aucClass(d.rocAuc)}`}>{d.rocAuc ?? "—"}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{d.precisionAt5}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{d.precisionAt10}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-muted">{d.positives}/{d.universe}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{d.enrichment}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {b.skipped.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            {S("未評估（金標準不足）：", "Not evaluated (insufficient gold standard): ")}
            {b.skipped.map((s) => `${s.diseaseName}（${s.reason}）`).join("、")}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 text-sm">
        <h2 className="font-semibold mb-2">{S("方法與限制", "Method & Limitations")}</h2>
        <p className="text-muted leading-relaxed">{b.method}</p>
        <p className="text-muted leading-relaxed mt-2">
          {S(
            "限制：金標準來自平台內部的實證連結（以關鍵詞比對推得），非獨立的人工策展金標準；本驗證衡量「預測是否具信號」，不等同臨床療效。靶點圖譜約半數為 AI 推斷（低信度），會稀釋訊號。",
            "Limitations: the gold standard is the platform's own keyword-matched evidence links, not an independent hand-curated set; this measures predictive signal, not clinical efficacy. ~Half the target graph is AI-inferred (low confidence), which dilutes signal.",
          )}
        </p>
      </section>
    </div>
  );
}
