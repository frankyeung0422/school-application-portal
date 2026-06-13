import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/locale-server";
import { SubscribeForm } from "@/components/marketing/SubscribeForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free PDF: Top 25 Herb-Drug Interactions for HK Clinicians · 中藥-西藥交互作用速查表",
  description:
    "A curated, GRADE-rated cheat sheet of the 25 most clinically significant herb-drug interactions seen in Hong Kong integrative practice. Free PDF, no login.",
  openGraph: {
    title: "Top 25 Herb-Drug Interactions for HK Clinicians",
    description: "Free GRADE-rated PDF cheat sheet. Cochrane-graded interactions, grouped by drug class.",
    type: "website",
  },
};

export default async function CheatsheetLandingPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="inline-block mb-3 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
          {T("免費下載 · 2026 年 5 月版", "Free download · May 2026 edition")}
        </div>
        <h1 className="text-4xl font-bold mb-3 leading-tight">
          {T(
            "中藥-西藥交互作用速查表",
            "Top 25 Herb-Drug Interactions",
          )}
        </h1>
        <p className="text-lg text-muted mb-1">
          {T(
            "香港臨床醫師 GRADE 評級參考",
            "GRADE-rated reference for HK clinicians",
          )}
        </p>
        <p className="text-sm text-muted">
          {T(
            "從 707 條 PubMed 證據整理 · A4 列印友好 · 中英對照",
            "Curated from 707 PubMed entries · A4 print-friendly · Bilingual",
          )}
        </p>
      </div>

      {/* Visual preview thumbnail */}
      <div className="mb-8 rounded-xl border-2 border-border bg-surface p-6 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <h2 className="font-semibold mb-2 text-base">
              {T("速查表內容包括：", "Inside the cheat sheet:")}
            </h2>
            <ul className="space-y-1.5 text-muted">
              <li>✓ {T("25 條臨床最常見交互", "25 most-clinical interactions")}</li>
              <li>✓ {T("按藥物分類分組", "Grouped by drug class")}</li>
              <li>✓ {T("嚴重度顏色編碼", "Severity-coded (Major / Moderate / Minor)")}</li>
              <li>✓ {T("機轉 + 處置建議", "Mechanism + management notes")}</li>
              <li>✓ {T("妊娠禁忌列表", "Pregnancy contraindications list")}</li>
              <li>✓ {T("PubMed PMID 引用", "PubMed PMID citations")}</li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-2 text-base">
              {T("最適合：", "Best for:")}
            </h2>
            <ul className="space-y-1.5 text-muted">
              <li>· {T("中醫師處方時參考", "TCM practitioners at point of Rx")}</li>
              <li>· {T("家庭醫學科 MD 評估補充品", "FM MDs evaluating supplements")}</li>
              <li>· {T("藥劑師用藥諮詢", "Pharmacist medication review")}</li>
              <li>· {T("臨床教學參考", "Clinical teaching reference")}</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            {T("MAJOR", "MAJOR")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
            {T("MODERATE", "MODERATE")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
            {T("MINOR", "MINOR")}
          </span>
          <span className="ml-auto">{T("6 頁 A4 · 列印或螢幕閱讀", "6 pages A4 · print or screen")}</span>
        </div>
      </div>

      {/* Capture form */}
      <div className="rounded-xl bg-primary/5 border-2 border-primary/30 p-6">
        <h2 className="text-xl font-bold mb-2">
          {T("輸入電郵立即取得 PDF", "Enter your email to get the PDF")}
        </h2>
        <p className="text-sm text-muted mb-4">
          {T(
            "提交後立即顯示完整速查表，可直接列印或匯出 PDF。我們不會發送垃圾郵件 — 大約每兩週一封新證據摘要。",
            "Submit and see the full cheat sheet immediately — print or save as PDF. No spam, ~biweekly evidence digest only.",
          )}
        </p>
        <SubscribeForm locale={locale} source="cheatsheet-herb-drug-2026" />
      </div>

      {/* Social proof / footer */}
      <div className="mt-10 text-center text-xs text-muted">
        <p className="mb-2">
          {T(
            "整理自 EvidenceBasedTCM 平台的 707 條 GRADE 評級證據資料庫。",
            "Compiled from EvidenceBasedTCM's database of 707 GRADE-rated entries.",
          )}
        </p>
        <p>
          {T(
            "問題或反饋？歡迎於 LinkedIn 私訊。資料每六個月更新一次。",
            "Questions or feedback? DM on LinkedIn. Updated every 6 months.",
          )}
        </p>
      </div>
    </div>
  );
}
