import { prisma } from "@/lib/db/prisma";
import { SymptomWizard } from "@/components/clinical/SymptomWizard";
import { AiSyndromeReasoner } from "@/components/diagnose/AiSyndromeReasoner";
import { getLocale } from "@/lib/i18n/locale-server";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";
import { PulsePositionDiagram } from "@/components/shared/PulsePositionDiagram";

export default async function SymptomsPage() {
  const locale = await getLocale();
  const patterns = await prisma.tcmPattern.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      pinyinName: true,
      chineseName: true,
      pathologyType: true,
      keySymptoms: true,
      tongue: true,
      pulse: true,
      treatmentPrinciple: true,
      patternFormulas: {
        include: {
          formula: {
            select: {
              id: true,
              pinyinName: true,
              chineseName: true,
              sourceText: true,
              actions: true,
              herbs: {
                include: {
                  herb: {
                    select: {
                      id: true,
                      pinyinName: true,
                      chineseName: true,
                      nature: true,
                      dosageRange: true,
                    },
                  },
                },
                orderBy: { role: "asc" },
              },
            },
          },
        },
        orderBy: { isPrimary: "desc" },
      },
      patternAcupoints: {
        include: {
          acupoint: {
            select: { id: true, code: true, pinyinName: true, chineseName: true, meridian: true },
          },
        },
      },
      conditionMappings: {
        include: {
          condition: { select: { id: true, westernName: true, icd11Code: true, description: true } },
        },
        orderBy: { frequency: "asc" },
      },
    },
  });

  // Hand-curated map from English westernName → Chinese disease name; shared
  // with the prescription analyzer's logic so both UIs surface the same gloss.
  const WESTERN_ZH: Record<string, string> = {
    "Influenza": "流行性感冒", "Common Cold": "普通感冒",
    "Acute Bronchitis": "急性支氣管炎", "Acute Pharyngitis": "急性咽炎",
    "Chronic Fatigue Syndrome": "慢性疲勞綜合徵", "Major Depressive Disorder": "重性抑鬱障礙",
    "Irritable Bowel Syndrome": "腸躁症", "Primary Insomnia": "原發性失眠",
    "Chronic Low Back Pain": "慢性下背痛", "Functional Dyspepsia": "功能性消化不良",
    "Essential Hypertension": "原發性高血壓", "Type 2 Diabetes Mellitus": "2型糖尿病",
    "Allergic Rhinitis": "過敏性鼻炎", "Menopausal Syndrome": "更年期綜合徵",
    "Migraine": "偏頭痛", "Knee Osteoarthritis": "膝骨關節炎",
    "Coronary Heart Disease": "冠狀動脈心臟病",
    "Chronic Obstructive Pulmonary Disease": "慢性阻塞性肺疾病",
    "Chemotherapy-Induced Nausea and Vomiting": "化療誘導的噁心嘔吐",
  };
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {locale === "zh-Hant" ? "辨證論治嚮導" : "Symptom → Pattern Wizard"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {locale === "zh-Hant"
          ? "以關鍵症狀群組配合舌象脈象，縮小中醫證型候選清單，自動推薦方劑與針灸取穴。"
          : "Select symptoms, tongue & pulse features to narrow candidate patterns — auto-suggests formulas with herb dosages and acupoints."}
      </p>
      <div className="mb-6">
        <AiSyndromeReasoner locale={locale} />
      </div>
      <div className="mb-6">
        <PulsePositionDiagram locale={locale} />
      </div>
      <SymptomWizard
        locale={locale}
        patterns={patterns.map((p) => ({
          id: p.id,
          name:
            locale === "zh-Hant" ? toTraditionalChinese(p.chineseName, locale) : p.pinyinName,
          pathologyType: p.pathologyType,
          keySymptoms: p.keySymptoms ?? "",
          tongue: p.tongue ?? "",
          pulse: p.pulse ?? "",
          treatmentPrinciple: p.treatmentPrinciple ?? "",
          formulas: p.patternFormulas.map((pf) => ({
            id: pf.formula.id,
            name: locale === "zh-Hant"
              ? toTraditionalChinese(pf.formula.chineseName, locale)
              : pf.formula.pinyinName,
            chineseName: toTraditionalChinese(pf.formula.chineseName, locale),
            pinyinName: pf.formula.pinyinName,
            source: pf.formula.sourceText,
            actions: pf.formula.actions,
            isPrimary: pf.isPrimary,
            herbs: pf.formula.herbs.map((fh) => ({
              id: fh.herb.id,
              name: locale === "zh-Hant"
                ? toTraditionalChinese(fh.herb.chineseName, locale)
                : fh.herb.pinyinName,
              chineseName: toTraditionalChinese(fh.herb.chineseName, locale),
              pinyinName: fh.herb.pinyinName,
              role: fh.role,
              dosage: fh.dosage,
              nature: fh.herb.nature,
              dosageRange: fh.herb.dosageRange,
            })),
          })),
          acupoints: p.patternAcupoints.map((pa) => ({
            id: pa.acupoint.id,
            code: pa.acupoint.code,
            name: locale === "zh-Hant"
              ? toTraditionalChinese(pa.acupoint.chineseName, locale)
              : pa.acupoint.pinyinName,
            meridian: pa.acupoint.meridian,
          })),
          conditions: p.conditionMappings.map((cm) => ({
            id: cm.condition.id,
            westernName: cm.condition.westernName,
            chineseName: WESTERN_ZH[cm.condition.westernName] ?? null,
            icd11Code: cm.condition.icd11Code,
            frequency: cm.frequency as "COMMON" | "OCCASIONAL" | "RARE",
          })),
        }))}
      />
    </div>
  );
}
