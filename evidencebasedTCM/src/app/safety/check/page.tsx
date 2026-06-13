import { prisma } from "@/lib/db/prisma";
import { SafetyChecker } from "@/components/clinical/SafetyChecker";
import { getLocale } from "@/lib/i18n/locale-server";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";

export default async function SafetyCheckPage() {
  const locale = await getLocale();

  const herbs = await prisma.herb.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      pinyinName: true,
      chineseName: true,
      drugInteractions: {
        select: { drugName: true, drugClass: true, severity: true, clinicalEffect: true, management: true },
      },
      contraindications: {
        select: { condition: true, severity: true, description: true, pregnancyCategory: true },
      },
      herbInteractionsA: {
        include: { herbB: { select: { id: true, pinyinName: true, chineseName: true } } },
      },
      herbInteractionsB: {
        include: { herbA: { select: { id: true, pinyinName: true, chineseName: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {locale === "zh-Hant" ? "用藥安全檢查" : "Safety & Interaction Checker"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {locale === "zh-Hant"
          ? "選取處方中的中藥及病人狀態，自動比對中藥間配伍、藥物交互作用、禁忌、妊娠分級等警示。"
          : "Select herbs in the prescription and patient conditions to surface herb–herb, herb–drug, contraindication, and pregnancy warnings."}
      </p>
      <SafetyChecker
        locale={locale}
        herbs={herbs.map((h) => ({
          id: h.id,
          name:
            locale === "zh-Hant" ? toTraditionalChinese(h.chineseName, locale) : h.pinyinName,
          drugInteractions: h.drugInteractions.map((d) => ({ ...d })),
          contraindications: h.contraindications.map((c) => ({ ...c })),
          herbPairs: [
            ...h.herbInteractionsA.map((x) => ({
              partnerId: x.herbB.id,
              partnerName:
                locale === "zh-Hant"
                  ? toTraditionalChinese(x.herbB.chineseName, locale)
                  : x.herbB.pinyinName,
              type: x.interactionType,
              severity: x.severity,
            })),
            ...h.herbInteractionsB.map((x) => ({
              partnerId: x.herbA.id,
              partnerName:
                locale === "zh-Hant"
                  ? toTraditionalChinese(x.herbA.chineseName, locale)
                  : x.herbA.pinyinName,
              type: x.interactionType,
              severity: x.severity,
            })),
          ],
        }))}
      />
    </div>
  );
}
