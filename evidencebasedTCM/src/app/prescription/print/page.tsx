import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { auth } from "@/lib/auth/authOptions";
import { ProGate } from "@/components/shared/ProGate";
import { PrintControls } from "@/components/prescription/PrintControls";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ formula?: string; patient?: string; clinic?: string; physician?: string }>;
}

/**
 * Print-ready prescription template — drives via window.print()
 * (browser → PDF). The clinic letterhead, patient info, and selected
 * formula come from query string for now; later cycles will load from
 * a saved patient case.
 */
export default async function PrescriptionPrintPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getLocale();
  const session = await auth();
  const isZh = locale === "zh-Hant";

  const physician = params.physician ?? session?.user?.name ?? (isZh ? "中醫師" : "TCM Physician");
  const clinic = params.clinic ?? (isZh ? "您的診所" : "Your Clinic");
  const patient = params.patient ?? (isZh ? "（患者姓名）" : "(Patient name)");

  const formula = params.formula
    ? await prisma.formula.findFirst({
        where: { OR: [{ id: params.formula }, { pinyinName: params.formula }] },
        include: {
          herbs: {
            include: { herb: { select: { id: true, chineseName: true, pinyinName: true } } },
            orderBy: { role: "asc" },
          },
        },
      })
    : null;

  const dateStr = new Date().toLocaleDateString(isZh ? "zh-TW" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <ProGate
      need="professional"
      feature={isZh ? "處方建構與列印（Pro 功能）" : "Prescription Builder & Printing (Pro)"}
      description={
        isZh
          ? "建構帶診所抬頭的列印處方，匯出為 PDF。執業醫師版功能。"
          : "Build print-ready prescriptions with clinic letterhead, export as PDF. Professional tier."
      }
    >
      {/* Screen-only controls */}
      <PrintControls locale={locale} />

      {/* Print-target letterhead */}
      <div className="prescription-sheet mx-auto bg-white text-slate-900 print:m-0 print:p-0">
        <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-wide">{clinic}</h1>
          <p className="text-sm text-slate-700 mt-1">
            {isZh ? "中醫處方箋 · TCM Prescription" : "TCM Prescription · 中醫處方箋"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="font-semibold">{isZh ? "病患" : "Patient"}：</span>
            <span className="border-b border-slate-400 inline-block min-w-[140px]">{patient}</span>
          </div>
          <div className="text-right">
            <span className="font-semibold">{isZh ? "日期" : "Date"}：</span>
            <span>{dateStr}</span>
          </div>
        </div>

        {formula ? (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-bold border-b border-slate-300 pb-1">
                {formula.chineseName}
                <span className="ml-3 text-sm font-normal text-slate-600">
                  {formula.pinyinName}
                  {formula.englishName && ` · ${formula.englishName}`}
                </span>
              </h2>
              {formula.sourceText && (
                <p className="text-xs text-slate-500 mt-1">
                  {isZh ? "出處：" : "Source: "}{formula.sourceText}
                </p>
              )}
            </div>

            {formula.actions && (
              <div className="text-sm mb-3">
                <span className="font-semibold">{isZh ? "功效：" : "Actions: "}</span>
                {formula.actions}
              </div>
            )}
            {formula.indications && (
              <div className="text-sm mb-4">
                <span className="font-semibold">{isZh ? "主治：" : "Indications: "}</span>
                {formula.indications}
              </div>
            )}

            <table className="w-full text-sm border-collapse mb-6">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="text-left py-2 px-1 font-semibold">{isZh ? "藥物" : "Herb"}</th>
                  <th className="text-left py-2 px-1 font-semibold">{isZh ? "拼音" : "Pinyin"}</th>
                  <th className="text-left py-2 px-1 font-semibold">{isZh ? "君臣佐使" : "Role"}</th>
                  <th className="text-left py-2 px-1 font-semibold">{isZh ? "劑量" : "Dosage"}</th>
                  <th className="text-left py-2 px-1 font-semibold">{isZh ? "備註" : "Notes"}</th>
                </tr>
              </thead>
              <tbody>
                {formula.herbs.map((fh) => (
                  <tr key={fh.id} className="border-b border-slate-200">
                    <td className="py-2 px-1 font-medium">{fh.herb.chineseName}</td>
                    <td className="py-2 px-1 text-slate-600">{fh.herb.pinyinName}</td>
                    <td className="py-2 px-1">
                      {{ JUN: isZh ? "君" : "Jun", CHEN: isZh ? "臣" : "Chen",
                         ZUO: isZh ? "佐" : "Zuo", SHI: isZh ? "使" : "Shi" }[fh.role]}
                    </td>
                    <td className="py-2 px-1">{fh.dosage ?? "—"}</td>
                    <td className="py-2 px-1 text-slate-600">{fh.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-sm mb-6 grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">{isZh ? "用法：" : "Administration: "}</span>
                <span className="text-slate-700">
                  {isZh
                    ? "水煎服，日一劑，分二次溫服。"
                    : "Decoct in water; one dose daily, divided into two warm administrations."}
                </span>
              </div>
              <div>
                <span className="font-semibold">{isZh ? "療程：" : "Course: "}</span>
                <span className="text-slate-700">
                  {isZh ? "____ 劑（____ 日）" : "____ doses (____ days)"}
                </span>
              </div>
            </div>

            {formula.modifications && (
              <div className="text-xs text-slate-600 leading-relaxed mb-6 p-3 border border-slate-200 rounded">
                <span className="font-semibold">{isZh ? "加減備註：" : "Modifications: "}</span>
                {formula.modifications}
              </div>
            )}
          </>
        ) : (
          <div className="my-12 text-center text-slate-500">
            {isZh
              ? "未選擇方劑。回到處方建構器選擇方劑後再列印。"
              : "No formula selected. Return to the prescription builder to choose a formula."}
          </div>
        )}

        {/* Footer with physician sign */}
        <div className="mt-12 grid grid-cols-2 gap-8 text-sm border-t border-slate-300 pt-6">
          <div>
            <div className="text-slate-500 mb-8">{isZh ? "醫師簽章" : "Physician Signature"}</div>
            <div className="border-t border-slate-400 pt-1">
              <span className="font-semibold">{physician}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 mb-8">{isZh ? "診所印章" : "Clinic Seal"}</div>
            <div className="border-t border-slate-400 pt-1">{clinic}</div>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500 text-center">
          {isZh
            ? "本處方由 EBTCM Clinical Decision Support 平台輔助建構。最終處方判斷由開立醫師負責。"
            : "Generated with EBTCM Clinical Decision Support. Final prescribing judgment rests with the issuing physician."}
        </p>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          @page { size: A4; margin: 18mm; }
          nav, header, footer, .no-print { display: none !important; }
          .prescription-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }
        .prescription-sheet {
          padding: 32px;
          max-width: 720px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }
      `}</style>
    </ProGate>
  );
}
