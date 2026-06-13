import { CaseNotebookUI } from "@/components/clinical/CaseNotebookUI";
import { getLocale } from "@/lib/i18n/locale-server";

export default async function CasesPage() {
  const locale = await getLocale();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {locale === "zh-Hant" ? "臨床病例簿" : "Patient Case Notebook"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {locale === "zh-Hant"
          ? "記錄每位患者的主訴、辨證、方藥及追蹤。所有資料僅保存在您的瀏覽器（localStorage）。"
          : "Record chief complaint, pattern differentiation, prescriptions and follow-up. Data stored locally in your browser."}
      </p>
      <CaseNotebookUI locale={locale} />
    </div>
  );
}
