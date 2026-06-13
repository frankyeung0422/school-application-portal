import { getLocale } from "@/lib/i18n/locale-server";
import { ConstitutionSurvey } from "@/components/clinical/ConstitutionSurvey";
import { getPractitionerContext } from "@/lib/patients/access";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

interface SP {
  searchParams: Promise<{ patient?: string }>;
}

export default async function ConstitutionPage({ searchParams }: SP) {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const sp = await searchParams;

  // If a practitioner is signed in AND query string ?patient=X is their patient,
  // offer to save the result to that patient's chart.
  let patientId: string | null = null;
  let patientName: string | null = null;
  if (sp.patient) {
    const ctx = await getPractitionerContext();
    if (ctx) {
      const p = await prisma.patient.findFirst({
        where: { id: sp.patient, practitionerId: ctx.userId },
        select: { id: true, name: true },
      });
      if (p) { patientId = p.id; patientName = p.name; }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">
        {T("中醫體質辨識 — 王琦 9 種體質", "TCM Constitution Assessment — Wang Qi 9 Types")}
      </h1>
      <p className="text-sm text-muted mb-2">
        {T(
          "9 體質模型由王琦院士於 2009 年制定，已納入《中醫體質分類與判定》中華中醫藥學會標準。",
          "Developed by Prof. Wang Qi (2009); adopted as the Chinese Medicine Constitution Classification standard.",
        )}
      </p>
      <p className="text-xs text-muted mb-6">
        {T(
          "本評估為 36 題簡化版，約 5 分鐘完成。結果僅供體質傾向參考，不能替代中醫師面診。",
          "36-item condensed version, ~5 minutes. Results indicate tendency only; not a substitute for in-person TCM consultation.",
        )}
      </p>

      {patientId && patientName && (
        <div className="mb-5 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          📋 {T("為以下病人填寫並儲存：", "Recording for patient: ")}
          <span className="font-semibold">{patientName}</span>
        </div>
      )}

      <ConstitutionSurvey locale={locale} patientId={patientId} />
    </div>
  );
}
