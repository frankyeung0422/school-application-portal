import { PrescriptionAnalyzer } from "@/components/diagnose/PrescriptionAnalyzer";
import { ProGate } from "@/components/shared/ProGate";
import { getLocale } from "@/lib/i18n/locale-server";
import { prisma } from "@/lib/db/prisma";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";
import { getConfiguredVisionProvider } from "@/lib/diagnose/prescription-analyzer";

export const dynamic = "force-dynamic";

export default async function PrescriptionDiagnosePage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const visionProvider = getConfiguredVisionProvider();
  const apiKeyConfigured = visionProvider !== null;

  const herbs = await prisma.herb.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, pinyinName: true, chineseName: true, category: true },
    orderBy: { pinyinName: "asc" },
  });
  const herbOptions = herbs.map((h) => ({
    id: h.id,
    chineseName: toTraditionalChinese(h.chineseName, locale),
    pinyinName: h.pinyinName,
    category: h.category,
  }));

  const providerLabel =
    visionProvider === "openai"
      ? "OpenAI gpt-4o-mini"
      : visionProvider === "anthropic"
        ? "Anthropic Claude Sonnet 4.6"
        : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {isZh ? "處方識別與用途分析" : "Prescription Analysis"}
      </h1>
      <p className="text-sm text-muted leading-relaxed mb-6">
        {isZh
          ? "拍攝醫師處方，或自行勾選藥材組合，AI 將對照本平台 220+ 味中藥、101+ 個方劑與 416+ 條證據，建議該方劑的可能用途與治療之疾病。"
          : "Photograph a TCM prescription, or pick herbs manually. The AI cross-references our database of 220+ herbs, 101+ formulas, and 416+ evidence entries to suggest likely uses and conditions treated."}
      </p>

      {/* Strong disclaimer */}
      <div className="mb-6 rounded-lg border-2 border-yellow-400/50 bg-yellow-50/50 dark:bg-yellow-900/10 p-4">
        <h2 className="text-sm font-bold mb-1">⚠ {isZh ? "重要免責聲明" : "Important Disclaimer"}</h2>
        <ul className="text-xs text-muted leading-relaxed space-y-1 list-disc pl-5">
          <li>
            {isZh
              ? "本工具僅為臨床決策輔助與用藥資訊查詢，不能取代您的中醫師面對面診斷與處方判斷。"
              : "This tool is informational and a clinical decision-support aid only. It does not replace your TCM physician's face-to-face diagnosis or prescribing judgment."}
          </li>
          <li>
            {isZh
              ? "AI 識別可能出現錯誤（特別是手寫處方），請務必以醫師原方為準，勿擅自更動劑量或藥物。"
              : "AI recognition may err — especially with handwriting. Always defer to the physician's original prescription. Never alter dosages or substitute herbs based on this output."}
          </li>
          <li>
            {isZh
              ? "若使用拍照分析，影像將即時傳送至 AI 提供商（OpenAI 或 Anthropic）進行解析，不會永久儲存於本平台。"
              : "If you use photo analysis, the image is transmitted to the configured AI provider (OpenAI or Anthropic) for parsing and is not retained on this platform."}
          </li>
        </ul>
      </div>

      <ProGate
        need="professional"
        feature={isZh ? "AI 處方拍照辨識（Pro 功能）" : "AI Prescription Photo Analysis (Pro)"}
        description={
          isZh
            ? "拍照分析使用 OpenAI 或 Anthropic 視覺模型解析處方，每月 200 次配額。手動選擇藥材無次數限制。執業醫師版可用。"
            : "Photo analysis uses OpenAI or Anthropic vision models, 200 analyses/month. Manual herb selection has no quota. Available on Professional tier."
        }
      >
        <PrescriptionAnalyzer
          locale={locale}
          herbs={herbOptions}
          photoEnabled={apiKeyConfigured}
          providerLabel={providerLabel}
        />
      </ProGate>
    </div>
  );
}
