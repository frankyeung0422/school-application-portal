import Link from "next/link";
import { DISEASE_CATALOG } from "@/lib/research/disease-catalog";
import { getLocale } from "@/lib/i18n/locale-server";

export default async function ResearchIndexPage() {
  const locale = await getLocale();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {locale === "zh-Hant" ? "創新治療研究" : "Innovation Research"}
      </h1>
      <p className="text-sm text-muted mb-6 leading-relaxed">
        {locale === "zh-Hant"
          ? "針對常見疾病，自動從實證資料庫與傳統中醫文獻挖掘可能的創新治療方案。每份報告包含辨證分型、方藥建議、針灸方案、生活調養，並連結至 PubMed、Cochrane、WHO、CNKI 等外部深度搜尋。"
          : "Automatically mines the evidence graph + classical TCM sources to propose innovative treatment strategies for common diseases. Each report includes pattern differentiation, herbal & acupuncture regimens, lifestyle guidance, and deep-search links to PubMed, Cochrane, WHO, and CNKI."}
      </p>

      <Link
        href="/research/rwe"
        className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 hover:border-emerald-500 transition-colors"
      >
        <div>
          <h2 className="font-semibold text-emerald-700">
            {locale === "zh-Hant" ? "真實世界證據儀表板 →" : "Real-World Evidence Dashboard →"}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {locale === "zh-Hant"
              ? "彙整門診實際療效資料，按方劑與證型分析症狀改善、有效率、不良反應與生理指標變化。"
              : "Aggregates real consultation outcomes by formula and pattern — symptom improvement, responder rate, adverse events, and vital-sign trajectories."}
          </p>
        </div>
        <span className="text-2xl">📊</span>
      </Link>

      <Link
        href="/research/discovery"
        className="mb-6 flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 hover:border-amber-500 transition-colors"
      >
        <div>
          <h2 className="font-semibold text-amber-700">
            {locale === "zh-Hant" ? "中藥重定位探索板 →" : "Repurposing Discovery Board →"}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {locale === "zh-Hant"
              ? "跨全部疾病，依分子靶點重疊挖掘最具潛力的「新治療方向」中藥與方劑候選。"
              : "Mines the strongest novel herb/formula→disease leads platform-wide by molecular-target overlap."}
          </p>
        </div>
        <span className="text-2xl">🧬</span>
      </Link>

      <Link
        href="/research/evidence-map"
        className="mb-6 flex items-center justify-between rounded-xl border border-sky-500/40 bg-sky-500/5 p-4 hover:border-sky-500 transition-colors"
      >
        <div>
          <h2 className="font-semibold text-sky-700">
            {locale === "zh-Hant" ? "實證地圖與文獻監測 →" : "Evidence Map & Literature Surveillance →"}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {locale === "zh-Hant"
              ? "各疾病證據分布（研究類型 × GRADE）、研究缺口辨識，與 PubMed 自動監測新文獻。"
              : "Per-disease evidence distribution (study-type × GRADE), gap detection, and automated PubMed surveillance."}
          </p>
        </div>
        <span className="text-2xl">🗺️</span>
      </Link>

      <Link
        href="/research/validation"
        className="mb-6 flex items-center justify-between rounded-xl border border-violet-500/40 bg-violet-500/5 p-4 hover:border-violet-500 transition-colors"
      >
        <div>
          <h2 className="font-semibold text-violet-700">
            {locale === "zh-Hant" ? "引擎驗證與可信度 →" : "Engine Validation & Credibility →"}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {locale === "zh-Hant"
              ? "以 ROC-AUC 衡量網絡藥理預測是否優於隨機，並為每個建議給出統一可信度評級。"
              : "Measures whether network-pharmacology predictions beat chance (ROC-AUC) and assigns each recommendation a unified credibility tier."}
          </p>
        </div>
        <span className="text-2xl">✅</span>
      </Link>

      <div className="grid gap-3 md:grid-cols-2">
        {DISEASE_CATALOG.map((d) => (
          <Link
            key={d.id}
            href={`/research/${d.id}`}
            className="group rounded-lg border border-border bg-surface p-4 hover:border-primary-light transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold group-hover:text-primary">
                  {locale === "zh-Hant" ? d.nameZh : d.nameEn}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {locale === "zh-Hant" ? d.nameEn : d.nameZh}
                </p>
              </div>
              <span className="font-mono text-[10px] text-muted bg-primary/5 rounded px-1.5 py-0.5">
                ICD-11 {d.icd11}
              </span>
            </div>
            <div className="mt-2 text-xs">
              <span className="text-muted">
                {locale === "zh-Hant" ? "中醫病名" : "TCM terms"}:{" "}
              </span>
              <span className="font-medium">{d.tcmTermsZh.join("、")}</span>
            </div>
            <div className="mt-1 text-xs">
              <span className="text-muted">
                {locale === "zh-Hant" ? "核心病機" : "Pattern hints"}:{" "}
              </span>
              <span className="text-primary">{d.commonPatternHints.slice(0, 3).join(" · ")}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
