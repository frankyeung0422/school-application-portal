import { getLocale } from "@/lib/i18n/locale-server";
import { InteractionChecker } from "@/components/safety/InteractionChecker";

export const dynamic = "force-dynamic";

export default async function InteractionsPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">
        {isZh ? "中藥-西藥交互作用即時查詢" : "Herb-Drug Interaction Checker"}
      </h1>
      <p className="text-sm text-muted mb-2">
        {isZh
          ? "輸入您正在服用或考慮處方的中藥與西藥，即時查看可能的交互作用、嚴重等級、機轉與處置建議。"
          : "Enter the herbs and Western medications under consideration. See severity, mechanism, and management notes in seconds — no login required."}
      </p>
      <p className="text-xs text-muted mb-6">
        {isZh
          ? "• 涵蓋十八反十九畏（中藥內部禁忌）與本平台收錄的 50+ 項中藥-西藥交互。"
          : "• Covers classical Chinese herb-herb incompatibilities (十八反十九畏) and 50+ catalogued herb-drug interactions."}
      </p>

      <InteractionChecker locale={locale} />

      <div className="mt-10 rounded-lg border border-yellow-400/40 bg-yellow-50/40 dark:bg-yellow-900/10 p-4 text-xs text-muted leading-relaxed">
        <p className="font-medium mb-1">
          {isZh ? "⚠ 免責聲明" : "⚠ Disclaimer"}
        </p>
        <p>
          {isZh
            ? "本工具為臨床決策輔助與用藥資訊查詢，「無交互作用記錄」不等於「絕對安全」。請結合患者個別狀況、藥代動力學與臨床判斷。"
            : "This tool is decision support only. \"No recorded interaction\" does NOT mean \"safe\". Always integrate with patient-specific pharmacokinetics, comorbidity, and clinical judgment."}
        </p>
      </div>
    </div>
  );
}
