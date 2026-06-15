import { getLocale } from "@/lib/i18n/locale-server";
import { PrintButton } from "@/components/marketing/PrintButton";

export const dynamic = "force-dynamic";

/**
 * LinkedIn carousel — 10 square slides. Print to PDF in browser to upload as
 * a swipeable LinkedIn document post.
 *
 * Print setup (Chrome):
 *   1. Click "Print"
 *   2. Paper size: Custom — 210 × 210 mm (or set width/height to match)
 *      OR keep A4 and the @page rule will force square slides per page
 *   3. Margins: None
 *   4. Background graphics: ON (Chrome → "More settings")
 *   5. Save as PDF → upload to LinkedIn as "Document"
 */

const SLIDES = [
  // Slide 1 — Cover
  {
    type: "cover" as const,
    title: { zh: "8 條 HK 臨床漏網的", en: "8 herb-drug interactions" },
    titleLine2: { zh: "中藥-西藥交互", en: "HK clinicians keep missing" },
    subtitle: { zh: "Cochrane 評級 · 2026", en: "Cochrane-graded · 2026" },
  },
  // Slide 2 — Legend
  { type: "legend" as const },
  // Slides 3-9 — Interaction cards
  {
    type: "card" as const,
    severity: "MAJOR" as const,
    slideNum: 1,
    herbZh: "丹參", herbPinyin: "Dan Shen",
    drug: "Warfarin",
    mechanism: { zh: "抗血小板 + ↑ INR", en: "Antiplatelet + ↑ INR" },
    effect: { zh: "嚴重出血風險 — 消化道、顱內", en: "Major bleeding — GI, intracranial" },
    management: { zh: "避免合用；如使用，每週監測 INR", en: "Avoid; if used, INR weekly" },
    evidence: "3 RCT, 2 case series",
  },
  {
    type: "card" as const,
    severity: "MAJOR" as const,
    slideNum: 2,
    herbZh: "銀杏葉", herbPinyin: "Yin Xing Ye (Ginkgo)",
    drug: "Warfarin / Antiplatelets",
    mechanism: { zh: "抑制血小板聚集 (PAF)", en: "PAF inhibition → platelet aggregation ↓" },
    effect: { zh: "自發性出血案例報告", en: "Spontaneous bleeding cases" },
    management: { zh: "術前 7 日停用", en: "Discontinue 7 days pre-op" },
    evidence: "Multiple case reports + 2 RCTs",
  },
  {
    type: "card" as const,
    severity: "MAJOR" as const,
    slideNum: 3,
    herbZh: "貫葉連翹", herbPinyin: "St John's Wort",
    drug: "Tacrolimus / Cyclosporine",
    mechanism: { zh: "強效 CYP3A4 + P-gp 誘導劑", en: "Potent CYP3A4 + P-gp inducer" },
    effect: { zh: "↓ 血藥濃度 → 移植排斥", en: "↓ serum levels → graft rejection" },
    management: { zh: "移植患者絕對禁用", en: "Hard contraindication in transplant" },
    evidence: "Established — multiple PK studies",
  },
  {
    type: "card" as const,
    severity: "MAJOR" as const,
    slideNum: 4,
    herbZh: "麻黃", herbPinyin: "Ma Huang (Ephedra)",
    drug: "MAOI / Stimulants",
    mechanism: { zh: "擬交感作用 ↑ 去甲腎上腺素", en: "Sympathomimetic ↑ NE" },
    effect: { zh: "高血壓危象、心肌梗死、中風", en: "Hypertensive crisis, MI, stroke" },
    management: { zh: "絕對禁用（多國已禁售）", en: "Avoid — banned in many jurisdictions" },
    evidence: "Established — case-fatality reports",
  },
  {
    type: "card" as const,
    severity: "MODERATE" as const,
    slideNum: 5,
    herbZh: "甘草 (高劑量)", herbPinyin: "Gan Cao",
    drug: "Digoxin / Diuretics",
    mechanism: { zh: "假性醛固酮增多症 → 低血鉀", en: "Pseudo-aldosteronism → hypokalemia" },
    effect: { zh: "↑ Digoxin 毒性風險；高血壓", en: "↑ digoxin toxicity, ↑ HTN" },
    management: { zh: "限 < 5 g/日；查血鉀", en: "Limit < 5 g/day; check K+" },
    evidence: "Well-documented mechanism",
  },
  {
    type: "card" as const,
    severity: "MODERATE" as const,
    slideNum: 6,
    herbZh: "黃連 (小檗鹼)", herbPinyin: "Huang Lian / Berberine",
    drug: "Metformin / Insulin",
    mechanism: { zh: "降糖作用加成", en: "Additive glucose lowering" },
    effect: { zh: "嚴格血糖控制者易低血糖", en: "Hypoglycemia under tight control" },
    management: { zh: "監測 BG；按需減量", en: "Monitor BG; dose-adjust" },
    evidence: "Multiple RCTs",
  },
  {
    type: "card" as const,
    severity: "MODERATE" as const,
    slideNum: 7,
    herbZh: "大豆異黃酮", herbPinyin: "Soy Isoflavones",
    drug: "Tamoxifen",
    mechanism: { zh: "植物雌激素干擾 ER 結合", en: "Phytoestrogenic ER interference" },
    effect: { zh: "↓ Tamoxifen 療效（in vivo 資料不一）", en: "↓ tamoxifen efficacy (mixed)" },
    management: { zh: "ER+ 乳癌患者避免", en: "Avoid in ER+ breast cancer" },
    evidence: "Theoretical + in vitro strong",
  },
  // Slide 10 — CTA
  { type: "cta" as const },
];

export default async function CarouselWeek1Page() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  return (
    <>
      <style>{`
        @page { size: 210mm 210mm; margin: 0; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .slide {
            page-break-after: always;
            break-after: page;
            width: 210mm !important;
            height: 210mm !important;
            margin: 0 !important;
          }
          .slide:last-child { page-break-after: auto; }
        }
        .slide {
          width: 540px;
          height: 540px;
          padding: 36px 36px 24px 36px;
          background: #fffbeb;
          color: #0f172a;
          display: flex;
          flex-direction: column;
          position: relative;
          font-family: ui-sans-serif, system-ui, "Source Han Sans TC", sans-serif;
        }
        .footer-strip {
          position: absolute;
          bottom: 16px;
          left: 36px;
          right: 36px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
        }
        .sev-major  { background: #fee2e2; color: #7f1d1d; }
        .sev-mod    { background: #ffedd5; color: #7c2d12; }
      `}</style>

      <div className="no-print bg-primary/5 border-b border-border sticky top-0 z-30">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-medium">
            🎞 {T("LinkedIn 輪播 — 列印為 PDF 後上傳", "LinkedIn carousel — print to PDF, then upload as a Document post")}
          </span>
          <PrintButton locale={locale} />
        </div>
        <p className="mx-auto max-w-3xl px-4 pb-3 text-xs text-muted">
          {T(
            "列印設定：紙張 210×210 mm（自訂）或 A4 直印；邊距：無；背景圖形：開啟。",
            "Print settings: paper size 210×210 mm (custom) or A4 portrait; margins: none; background graphics: ON.",
          )}
        </p>
      </div>

      <div className="mx-auto py-6 space-y-6 flex flex-col items-center print:p-0 print:space-y-0">
        {SLIDES.map((slide, i) => {
          if (slide.type === "cover") {
            return (
              <div key={i} className="slide shadow-lg print:shadow-none">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 mb-auto">
                  EvidenceBasedTCM
                </div>
                <div className="my-auto">
                  <h1 className="text-[44px] leading-[1.1] font-bold mb-3">
                    {isZh ? slide.title.zh : slide.title.en}
                  </h1>
                  <h2 className="text-[28px] leading-[1.1] font-bold text-slate-700">
                    {isZh ? slide.titleLine2.zh : slide.titleLine2.en}
                  </h2>
                  <div className="mt-8 text-sm text-slate-500">
                    {isZh ? slide.subtitle.zh : slide.subtitle.en}
                  </div>
                </div>
                <div className="mt-auto text-xs text-slate-400 self-end">
                  {T("向左滑動 →", "Swipe →")}
                </div>
                <FooterStripContent slideNo={1} />
              </div>
            );
          }

          if (slide.type === "legend") {
            return (
              <div key={i} className="slide shadow-lg print:shadow-none">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 mb-4">
                  {T("如何閱讀", "How to read this")}
                </div>
                <div className="space-y-3 my-auto">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-2 rounded-full bg-red-500 shrink-0" />
                    <div>
                      <div className="font-bold text-base">MAJOR · 重度禁忌</div>
                      <div className="text-xs text-slate-600">{T("絕對避免；嚴重臨床傷害已報告", "Hard avoid; serious clinical harm reported")}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-2 rounded-full bg-orange-500 shrink-0" />
                    <div>
                      <div className="font-bold text-base">MODERATE · 中度慎用</div>
                      <div className="text-xs text-slate-600">{T("謹慎使用；監測檢驗值或臨床指標", "Use with caution; monitor labs / clinical signs")}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-2 rounded-full bg-yellow-500 shrink-0" />
                    <div>
                      <div className="font-bold text-base">MINOR · 輕度注意</div>
                      <div className="text-xs text-slate-600">{T("理論性或低發生率風險", "Theoretical or low-incidence concern")}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-auto text-xs text-slate-500 pt-4 border-t border-slate-200">
                  {T(
                    "評級依據：Cochrane RoB-2 + GRADE。「未列出」≠ 安全。",
                    "Grades: Cochrane RoB-2 + GRADE. \"Not listed\" ≠ safe.",
                  )}
                </div>
                <FooterStripContent slideNo={2} />
              </div>
            );
          }

          if (slide.type === "card") {
            const sevCls = slide.severity === "MAJOR" ? "sev-major" : "sev-mod";
            return (
              <div key={i} className="slide shadow-lg print:shadow-none">
                <div className="flex items-baseline justify-between mb-3">
                  <div className={`inline-block ${sevCls} px-2.5 py-1 rounded text-xs font-bold tracking-wider`}>
                    {slide.severity}
                  </div>
                  <div className="text-xs text-slate-400">
                    {slide.slideNum} / 8
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[38px] leading-tight font-bold">
                    {slide.herbZh}
                  </div>
                  <div className="text-base text-slate-500 mt-0.5">
                    {slide.herbPinyin}
                  </div>
                  <div className="text-3xl text-slate-400 my-1">×</div>
                  <div className="text-[28px] leading-tight font-bold">
                    {slide.drug}
                  </div>
                </div>

                <div className="space-y-2.5 text-[13px] leading-snug">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">
                      {T("機轉", "Mechanism")}
                    </div>
                    <div>{isZh ? slide.mechanism.zh : slide.mechanism.en}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">
                      {T("臨床效應", "Clinical effect")}
                    </div>
                    <div>{isZh ? slide.effect.zh : slide.effect.en}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">
                      {T("處置", "Management")}
                    </div>
                    <div className="font-medium">{isZh ? slide.management.zh : slide.management.en}</div>
                  </div>
                </div>

                <div className="mt-auto text-xs text-slate-400">
                  {T("證據：", "Evidence: ")}{slide.evidence}
                </div>
                <FooterStripContent slideNo={i + 1} />
              </div>
            );
          }

          // CTA
          return (
            <div key={i} className="slide shadow-lg print:shadow-none">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 mb-auto">
                {T("完整查詢", "Full checker")}
              </div>

              <div className="my-auto text-center">
                <div className="text-[26px] font-bold mb-2 leading-tight">
                  {T("完整互動式查詢", "Full interactive checker")}
                </div>
                <div className="text-sm text-slate-600 mb-6">
                  {T("免費 · 免登入 · 中英雙語", "Free · No login · Bilingual")}
                </div>
                <div className="inline-block px-4 py-3 border-2 border-emerald-600 rounded-lg">
                  <div className="text-lg font-mono font-bold text-emerald-700">
                    evidencebasedtcm.com
                  </div>
                  <div className="text-sm font-mono text-emerald-700">
                    /interactions
                  </div>
                </div>
                <div className="mt-6 text-xs text-slate-500">
                  {T("PDF 速查表下載：", "PDF cheat sheet:")}<br/>
                  <span className="font-mono">/cheatsheet/herb-drug-2026</span>
                </div>
              </div>

              <FooterStripContent slideNo={10} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function FooterStripContent({ slideNo }: { slideNo: number }) {
  return (
    <div className="footer-strip">
      <span>evidencebasedtcm.com</span>
      <span>{slideNo} / 10</span>
    </div>
  );
}
