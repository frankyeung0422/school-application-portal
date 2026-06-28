import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTier, tierAtLeast } from "@/lib/auth/tier";
import { getLocale } from "@/lib/i18n/locale-server";
import { HandoutPrintButton } from "@/components/handouts/HandoutPrintButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ formulaId: string }>;
}

const ROLE_LABELS: Record<string, string> = {
  JUN: "君藥",
  CHEN: "臣藥",
  ZUO: "佐藥",
  SHI: "使藥",
};

const NATURE_LABELS: Record<string, string> = {
  HOT: "熱",
  WARM: "溫",
  NEUTRAL: "平",
  COOL: "涼",
  COLD: "寒",
};

const GRADE_LABELS: Record<string, string> = {
  A: "A 級（強）",
  B: "B 級（中）",
  C: "C 級（低）",
  D: "D 級（極低）",
};

export async function generateMetadata({ params }: Props) {
  const { formulaId } = await params;
  const f = await prisma.formula.findUnique({ where: { id: formulaId }, select: { chineseName: true, pinyinName: true } });
  return { title: f ? `患者資料：${f.chineseName} — EBTCM` : "患者資料 — EBTCM" };
}

export default async function HandoutPage({ params }: Props) {
  const { formulaId } = await params;
  const tier = await getCurrentTier();
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";

  if (!tierAtLeast(tier, "professional")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-bold mb-2">{isZh ? "此功能需要執業醫師版" : "Professional plan required"}</h1>
        <p className="text-sm text-muted mb-6">
          {isZh
            ? "患者資料列印功能專為執業中醫師設計，升級後即可為每位患者生成個人化資料。"
            : "Patient handouts are designed for licensed TCM practitioners. Upgrade to generate personalised materials for each patient."}
        </p>
        <Link href="/pricing" className="rounded-lg bg-primary text-white px-6 py-2.5 font-semibold hover:bg-primary-light transition-colors">
          {isZh ? "查看訂閱方案" : "View Pricing"}
        </Link>
      </div>
    );
  }

  const formula = await prisma.formula.findUnique({
    where: { id: formulaId },
    include: {
      herbs: {
        include: {
          herb: {
            select: {
              chineseName: true,
              pinyinName: true,
              latinName: true,
              nature: true,
              flavor: true,
              category: true,
              toxicityClass: true,
              contraindications: {
                where: { pregnancyCategory: { not: null } },
                select: { pregnancyCategory: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { role: "asc" },
      },
      patternFormulas: {
        include: { pattern: { select: { chineseName: true, englishName: true } } },
        take: 3,
      },
      evidenceLinks: {
        include: {
          evidence: { select: { evidenceGrade: true, studyType: true, title: true, year: true } },
        },
        take: 5,
      },
    },
  });

  if (!formula) notFound();

  const gradeACounts = formula.evidenceLinks.filter((e) => e.evidence.evidenceGrade === "A").length;
  const gradeBCounts = formula.evidenceLinks.filter((e) => e.evidence.evidenceGrade === "B").length;
  const totalEvidence = formula.evidenceLinks.length;

  const pregnancyHerbs = formula.herbs.filter((fh) => fh.herb.contraindications.length > 0).map((fh) => fh.herb.chineseName);
  const toxicHerbs = formula.herbs.filter((fh) => fh.herb.toxicityClass && fh.herb.toxicityClass !== "無毒").map((fh) => ({
    name: fh.herb.chineseName,
    toxicity: fh.herb.toxicityClass,
  }));

  const today = new Date().toLocaleDateString("zh-HK", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Screen-only header */}
      <div className="print:hidden mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href={`/formulas/${formulaId}`} className="text-sm text-muted hover:text-foreground">
            ← {isZh ? "返回方劑" : "Back to formula"}
          </Link>
          <h1 className="text-xl font-bold mt-1">{isZh ? "患者資料列印" : "Patient Handout"}</h1>
        </div>
        <HandoutPrintButton />
      </div>

      {/* ===== PRINTABLE HANDOUT ===== */}
      <div className="handout-sheet bg-white border border-border rounded-2xl p-8 shadow-sm print:border-0 print:shadow-none print:rounded-none print:p-6">

        {/* Header */}
        <div className="border-b-2 border-primary pb-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-primary leading-tight">{formula.chineseName}</h2>
              <p className="text-lg text-muted mt-0.5">{formula.pinyinName}</p>
              {formula.englishName && (
                <p className="text-base text-muted">{formula.englishName}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted">EBTCM 循證中醫平台</div>
              <div className="text-xs text-muted mt-0.5">{today}</div>
              <div className="mt-1 inline-block rounded bg-teal-50 text-teal-800 text-xs px-2 py-0.5 font-medium">
                {formula.category}
              </div>
            </div>
          </div>
        </div>

        {/* What is this formula for */}
        {(formula.indications || formula.patternFormulas.length > 0) && (
          <section className="mb-5">
            <h3 className="section-title">🎯 {isZh ? "適用症狀與適應症" : "Indications"}</h3>
            {formula.indications && (
              <p className="text-sm leading-relaxed mb-2">{formula.indications}</p>
            )}
            {formula.patternFormulas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {formula.patternFormulas.map((pf) => (
                  <span key={pf.pattern.chineseName} className="rounded-full bg-primary/10 text-primary text-xs px-3 py-1 font-medium">
                    {pf.pattern.chineseName}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* How to take */}
        <section className="mb-5">
          <h3 className="section-title">💊 {isZh ? "服藥方法" : "How to Take"}</h3>
          {formula.dosageInstructions ? (
            <p className="text-sm leading-relaxed">{formula.dosageInstructions}</p>
          ) : (
            <p className="text-sm text-muted leading-relaxed">
              {isZh
                ? "請依醫師或藥師的個別指示服藥。一般水煎劑每日一劑，分兩次溫服。"
                : "Take as directed by your practitioner or pharmacist. Generally one decoction daily in two divided doses, served warm."}
            </p>
          )}
        </section>

        {/* Herb composition */}
        <section className="mb-5">
          <h3 className="section-title">🌿 {isZh ? "組成藥材" : "Ingredients"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {formula.herbs.map((fh) => (
              <div key={fh.herb.chineseName} className="rounded-lg border border-border bg-surface p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="text-sm font-semibold">{fh.herb.chineseName}</p>
                    <p className="text-xs text-muted">{fh.herb.pinyinName}</p>
                  </div>
                  {fh.role && (
                    <span className="text-xs rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 shrink-0 mt-0.5">
                      {ROLE_LABELS[fh.role] ?? fh.role}
                    </span>
                  )}
                </div>
                {fh.herb.nature && (
                  <p className="text-xs text-muted mt-1">藥性：{NATURE_LABELS[fh.herb.nature] ?? fh.herb.nature}</p>
                )}
                {fh.dosage && (
                  <p className="text-xs text-muted">劑量：{fh.dosage}</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">
            {isZh ? "* 君藥 = 主藥；臣藥 = 輔藥；佐藥 = 調節；使藥 = 引經" : "* JUN = chief; CHEN = deputy; ZUO = assistant; SHI = envoy"}
          </p>
        </section>

        {/* Precautions */}
        {(formula.contraindications || pregnancyHerbs.length > 0 || toxicHerbs.length > 0) && (
          <section className="mb-5">
            <h3 className="section-title text-rose-700">⚠️ {isZh ? "注意事項及禁忌" : "Precautions & Contraindications"}</h3>
            {formula.contraindications && (
              <p className="text-sm leading-relaxed mb-2 text-rose-900">{formula.contraindications}</p>
            )}
            {pregnancyHerbs.length > 0 && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 mb-2">
                <p className="text-xs font-semibold text-rose-800 mb-1">妊娠禁忌：</p>
                <p className="text-xs text-rose-700">
                  {pregnancyHerbs.join("、")} — {isZh ? "孕婦慎用或禁用，請先諮詢醫師。" : "Contraindicated or use with caution in pregnancy. Consult your practitioner first."}
                </p>
              </div>
            )}
            {toxicHerbs.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">含毒性藥材：</p>
                {toxicHerbs.map((h) => (
                  <p key={h.name} className="text-xs text-amber-700">
                    {h.name}（{h.toxicity}）— 請嚴格依處方劑量服用。
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Evidence basis */}
        {totalEvidence > 0 && (
          <section className="mb-5">
            <h3 className="section-title">📊 {isZh ? "科學實證基礎" : "Evidence Base"}</h3>
            <p className="text-sm leading-relaxed mb-2">
              {isZh
                ? `本方劑目前在平台上共有 ${totalEvidence} 篇相關研究記錄，其中 Grade A（強質素）${gradeACounts} 篇、Grade B（中質素）${gradeBCounts} 篇，顯示具備一定的臨床實證支持。`
                : `This formula has ${totalEvidence} linked studies on the EBTCM platform, including ${gradeACounts} Grade-A and ${gradeBCounts} Grade-B studies, indicating a meaningful clinical evidence base.`}
            </p>
            {formula.evidenceLinks.slice(0, 3).map((el) => (
              <div key={el.evidence.title} className="text-xs text-muted border-l-2 border-primary/30 pl-2 mb-1">
                {GRADE_LABELS[el.evidence.evidenceGrade] ?? el.evidence.evidenceGrade}
                {el.evidence.year ? ` (${el.evidence.year})` : ""}
                {" — "}
                {el.evidence.title}
              </div>
            ))}
          </section>
        )}

        {/* Actions / therapeutic rationale */}
        {formula.actions && (
          <section className="mb-5">
            <h3 className="section-title">🔬 {isZh ? "功效" : "Actions"}</h3>
            <p className="text-sm leading-relaxed">{formula.actions}</p>
          </section>
        )}

        {/* Footer disclaimer */}
        <div className="mt-8 pt-4 border-t border-border">
          <p className="text-xs text-muted leading-relaxed">
            {isZh
              ? "本資料由 EBTCM 循證中醫平台生成，僅供參考。中藥治療具有個體差異，本資料不能取代持牌中醫師的診斷及治療意見。如有任何疑問，請諮詢您的主診醫師。"
              : "This handout is generated by the EBTCM Evidence-Based TCM Platform for reference only. Herbal treatment outcomes vary between individuals. This document does not replace the diagnosis or advice of a licensed TCM practitioner. Please consult your practitioner if you have any questions."}
          </p>
          <p className="text-xs text-muted mt-1">
            ebtcm.app · {today}
          </p>
        </div>
      </div>

      {/* Print styles (scoped via Tailwind arbitrary) */}
      <style>{`
        @media print {
          .handout-sheet { border: none !important; box-shadow: none !important; }
          .section-title { font-size: 0.9rem; font-weight: 700; margin-bottom: 0.4rem; color: #1a5276; }
        }
        .section-title { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: #1a5276; border-bottom: 1px solid #e8f0fe; padding-bottom: 0.25rem; }
      `}</style>
    </div>
  );
}
