import { CaseNotebookUI } from "@/components/clinical/CaseNotebookUI";
import { getLocale } from "@/lib/i18n/locale-server";
import { getCurrentUserId } from "@/lib/auth/tier";
import { prisma } from "@/lib/db/prisma";
import type { CaseNotebook } from "@/lib/clinical/storage";

export const dynamic = "force-dynamic";

function parseArr(s: string): string[] {
  try { return JSON.parse(s) as string[]; } catch { return []; }
}

export default async function CasesPage() {
  const [locale, userId] = await Promise.all([getLocale(), getCurrentUserId()]);
  const isZh = locale === "zh-Hant";

  const initialCases: CaseNotebook[] = userId
    ? (
        await prisma.caseNote.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        })
      ).map((n) => ({
        id: n.id,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        patientInitials: n.patientInitials,
        chiefComplaint: n.chiefComplaint,
        diagnosis: n.diagnosis,
        patternIds: parseArr(n.patternIds),
        formulaIds: parseArr(n.formulaIds),
        acupointIds: parseArr(n.acupointIds),
        herbIds: parseArr(n.herbIds),
        notes: n.notes,
      }))
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {isZh ? "臨床病例簿" : "Patient Case Notebook"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {userId
          ? (isZh ? "所有病例已同步至您的帳戶，跨裝置可用。" : "Cases are synced to your account and available across devices.")
          : (isZh
              ? "記錄每位患者的主訴、辨證、方藥及追蹤。所有資料僅保存在您的瀏覽器（localStorage）。"
              : "Record chief complaint, pattern differentiation, prescriptions and follow-up. Data stored locally in your browser.")}
      </p>
      <CaseNotebookUI locale={locale} userId={userId} initialCases={initialCases} />
    </div>
  );
}
