import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { PrintButton } from "@/components/marketing/PrintButton";
import { INTERACTIONS, PREGNANCY_CONTRAINDICATED } from "@/lib/marketing/cheatsheet-data";

export const dynamic = "force-dynamic";

export default async function CheatsheetPreviewPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const sections = [
    { id: "anticoagulants", titleZh: "1. 抗凝/抗血小板", titleEn: "1. Anticoagulants / Antiplatelets" },
    { id: "cyp3a4", titleZh: "2. CYP3A4 / 藥代動力學", titleEn: "2. CYP3A4 / Pharmacokinetic" },
    { id: "glycemic", titleZh: "3. 降糖藥", titleEn: "3. Antidiabetics" },
    { id: "cns", titleZh: "4. 中樞神經", titleEn: "4. CNS / Sedatives" },
    { id: "hormonal", titleZh: "5. 內分泌 / 荷爾蒙", titleEn: "5. Hormonal" },
    { id: "other", titleZh: "6. 其他重要交互", titleEn: "6. Other Notable" },
  ];

  return (
    <>
      {/* Print stylesheet — A4, no Navbar/footer in print */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .cheatsheet-page {
            page-break-after: always;
            break-after: page;
            min-height: auto !important;
          }
          .cheatsheet-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
        .cheatsheet-page {
          min-height: 270mm;
          padding: 8mm;
          break-inside: avoid;
        }
        .sev-major  { background: #fee2e2; border-color: #dc2626; color: #7f1d1d; }
        .sev-mod    { background: #ffedd5; border-color: #ea580c; color: #7c2d12; }
        .sev-minor  { background: #fef3c7; border-color: #ca8a04; color: #78350f; }
        .sev-contra { background: #fecaca; border-color: #991b1b; color: #7f1d1d; }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print bg-primary/5 border-b border-border sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-medium">
            ✅ {T("這就是速查表 — 可立即列印或匯出 PDF", "This is the cheat sheet — print or save as PDF now")}
          </span>
          <PrintButton locale={locale} />
          <Link
            href="/interactions"
            className="ml-auto text-xs text-primary hover:underline"
          >
            {T("互動式查詢 →", "Interactive checker →")}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl bg-white text-slate-900 print:max-w-none">
        {/* ============ PAGE 1 — COVER ============ */}
        <section className="cheatsheet-page flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-xs uppercase tracking-widest text-emerald-700 mb-3">
              EvidenceBasedTCM · 2026
            </div>
            <h1 className="text-5xl font-bold mb-3 leading-tight">
              中藥-西藥<br/>交互作用速查表
            </h1>
            <p className="text-2xl text-slate-600 mb-1">
              Herb-Drug Interaction Quick Reference
            </p>
            <p className="text-sm text-slate-500 mb-8">
              香港臨床醫師參考 · For the Modern Hong Kong Clinic
            </p>

            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm mb-12">
              <div className="text-right text-slate-500">25 herb-drug pairs</div>
              <div className="text-left font-semibold">25 條中藥-西藥組合</div>
              <div className="text-right text-slate-500">6 pregnancy contraindications</div>
              <div className="text-left font-semibold">6 妊娠禁忌</div>
              <div className="text-right text-slate-500">GRADE-rated, Cochrane RoB-2</div>
              <div className="text-left font-semibold">GRADE 評級 · Cochrane RoB-2</div>
              <div className="text-right text-slate-500">A4 · Bilingual</div>
              <div className="text-left font-semibold">A4 · 中英對照</div>
            </div>

            <div className="px-6 py-4 border-2 border-emerald-600 rounded-lg">
              <div className="text-xs uppercase tracking-widest text-emerald-700 mb-1">
                Edition / 版本
              </div>
              <div className="text-lg font-semibold">v2026.05 · May 2026</div>
            </div>
          </div>
          <FooterStrip />
        </section>

        {/* ============ PAGE 2 — METHODOLOGY + ANTICOAGULANTS ============ */}
        <section className="cheatsheet-page">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-emerald-600 pb-2">
            方法學 · Methodology
          </h2>
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <h3 className="font-semibold mb-1">資料來源</h3>
              <p className="text-slate-700 leading-relaxed">
                整理自 EvidenceBasedTCM 平台 707 條 GRADE 評級證據資料庫，
                主要為 PubMed 上的 RCT、系統評價與薈萃分析。每條交互作用
                按 Cochrane RoB-2 偏倚風險評估打分。
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Sources</h3>
              <p className="text-slate-700 leading-relaxed">
                Curated from EBTCM's 707 GRADE-rated entries — PubMed RCTs,
                systematic reviews, meta-analyses. Each interaction scored
                against Cochrane RoB-2.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6 text-xs">
            <SeverityLegend label="MAJOR" zh="重度禁忌" cls="sev-major" />
            <SeverityLegend label="MODERATE" zh="中度慎用" cls="sev-mod" />
            <SeverityLegend label="MINOR" zh="輕度注意" cls="sev-minor" />
            <SeverityLegend label="CONTRA." zh="絕對禁用" cls="sev-contra" />
          </div>

          <h2 id="anticoagulants" className="text-xl font-bold mb-3 border-b-2 border-slate-400 pb-1.5">
            {T("1. 抗凝 / 抗血小板", "1. Anticoagulants / Antiplatelets")}
          </h2>
          <div className="space-y-2">
            {INTERACTIONS.filter((i) => i.group === "anticoagulants").map((i, idx) => (
              <InteractionRow key={idx} interaction={i} isZh={isZh} />
            ))}
          </div>
        </section>

        {/* ============ PAGE 3 — CYP3A4 + GLYCEMIC ============ */}
        <section className="cheatsheet-page">
          <h2 id="cyp3a4" className="text-xl font-bold mb-3 border-b-2 border-slate-400 pb-1.5">
            {T("2. CYP3A4 / 藥代動力學", "2. CYP3A4 / Pharmacokinetic")}
          </h2>
          <div className="space-y-2 mb-6">
            {INTERACTIONS.filter((i) => i.group === "cyp3a4").map((i, idx) => (
              <InteractionRow key={idx} interaction={i} isZh={isZh} />
            ))}
          </div>

          <h2 id="glycemic" className="text-xl font-bold mb-3 border-b-2 border-slate-400 pb-1.5">
            {T("3. 降糖藥", "3. Antidiabetics")}
          </h2>
          <div className="space-y-2">
            {INTERACTIONS.filter((i) => i.group === "glycemic").map((i, idx) => (
              <InteractionRow key={idx} interaction={i} isZh={isZh} />
            ))}
          </div>
        </section>

        {/* ============ PAGE 4 — CNS + HORMONAL + OTHER ============ */}
        <section className="cheatsheet-page">
          <h2 id="cns" className="text-xl font-bold mb-3 border-b-2 border-slate-400 pb-1.5">
            {T("4. 中樞神經 / 鎮靜", "4. CNS / Sedatives")}
          </h2>
          <div className="space-y-2 mb-6">
            {INTERACTIONS.filter((i) => i.group === "cns").map((i, idx) => (
              <InteractionRow key={idx} interaction={i} isZh={isZh} />
            ))}
          </div>

          <h2 id="hormonal" className="text-xl font-bold mb-3 border-b-2 border-slate-400 pb-1.5">
            {T("5. 內分泌 / 荷爾蒙", "5. Hormonal")}
          </h2>
          <div className="space-y-2 mb-6">
            {INTERACTIONS.filter((i) => i.group === "hormonal").map((i, idx) => (
              <InteractionRow key={idx} interaction={i} isZh={isZh} />
            ))}
          </div>

          <h2 id="other" className="text-xl font-bold mb-3 border-b-2 border-slate-400 pb-1.5">
            {T("6. 其他重要交互", "6. Other Notable")}
          </h2>
          <div className="space-y-2">
            {INTERACTIONS.filter((i) => i.group === "other").map((i, idx) => (
              <InteractionRow key={idx} interaction={i} isZh={isZh} />
            ))}
          </div>
        </section>

        {/* ============ PAGE 5 — PREGNANCY CONTRAINDICATIONS ============ */}
        <section className="cheatsheet-page">
          <h2 className="text-2xl font-bold mb-3 border-b-2 border-red-700 pb-2 text-red-900">
            🤰 {T("妊娠絕對禁忌", "Pregnancy — Absolute Contraindications")}
          </h2>
          <p className="text-sm text-slate-700 mb-5 leading-relaxed">
            {T(
              "以下中藥於妊娠期間絕對禁用，無論劑量或合併用藥。多為強烈活血、破瘀、行氣或興奮子宮平滑肌之品。患者首次就診應主動詢問懷孕狀況。",
              "These herbs are absolutely contraindicated in pregnancy regardless of dose or co-medication. Most are strong blood-movers, qi-breakers, or uterine stimulants. Always ask pregnancy status at first visit.",
            )}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {PREGNANCY_CONTRAINDICATED.map((h, idx) => (
              <div key={idx} className="border-2 border-red-700 rounded-lg p-3 sev-contra">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-lg font-bold">{h.chinese}</span>
                  <span className="text-xs">{h.pinyin}</span>
                </div>
                <p className="text-xs leading-relaxed">{isZh ? h.zhReason : h.enReason}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-400 rounded-lg text-xs leading-relaxed">
            <strong>⚠ {T("臨床建議", "Clinical note")}:</strong>{" "}
            {T(
              "若患者已誤服上述中藥且確認懷孕，應立即停用並轉介產科評估。劑量、療程、孕週均影響風險評估。",
              "If patient has already taken any of these and pregnancy is confirmed, discontinue immediately and refer for OB evaluation. Dose, duration, and gestational age all affect risk.",
            )}
          </div>
        </section>

        {/* ============ PAGE 6 — DISCLAIMER + GO DEEPER ============ */}
        <section className="cheatsheet-page">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-emerald-600 pb-2">
            {T("使用方式 · 局限性 · 延伸資源", "Use · Limitations · Go Deeper")}
          </h2>

          <h3 className="font-semibold mb-1 mt-4">{T("如何使用本速查表", "How to use")}</h3>
          <ul className="text-sm text-slate-700 leading-relaxed space-y-1 pl-5 list-disc">
            <li>{T("處方時參考。處方前主動詢問患者是否服用慢性西藥/補充品。", "Reference at point of prescribing. Ask explicitly about Western meds + supplements.")}</li>
            <li>{T("\"未列出\" ≠ \"絕對安全\" — 中藥交互作用文獻仍稀疏。", "\"Not listed\" ≠ \"safe combination\". The literature on TCM interactions is sparse.")}</li>
            <li>{T("劑量、劑型（湯劑/濃縮顆粒/酊劑）與個體差異均影響風險。", "Dose, form (decoction / granule / tincture), and patient factors all affect risk.")}</li>
          </ul>

          <h3 className="font-semibold mb-1 mt-5">{T("局限性與免責聲明", "Limitations & Disclaimer")}</h3>
          <ul className="text-sm text-slate-700 leading-relaxed space-y-1 pl-5 list-disc">
            <li>{T("本資料為臨床決策輔助，不能取代專業判斷。", "This is decision support, not a substitute for clinical judgment.")}</li>
            <li>{T("資料截至 2026 年 5 月。新證據持續累積。", "Data current as of May 2026. New evidence accumulates continuously.")}</li>
            <li>{T("僅供註冊醫療專業人員參考使用。", "Intended for licensed healthcare professionals only.")}</li>
          </ul>

          <h3 className="font-semibold mb-1 mt-5">{T("延伸資源", "Go Deeper")}</h3>
          <ul className="text-sm text-slate-700 leading-relaxed space-y-1.5 pl-5 list-disc">
            <li>
              <strong>{T("完整互動式查詢", "Full interactive checker")}</strong>
              {" — "}
              <span className="font-mono text-emerald-700">evidencebasedtcm.com/interactions</span>
              {T("（免費 · 免登入 · 多藥同時比對）", " (free · no login · multi-herb)")}
            </li>
            <li>
              <strong>{T("707 條 GRADE 證據庫", "707-entry GRADE database")}</strong>
              {" — "}
              <span className="font-mono text-emerald-700">evidencebasedtcm.com/evidence</span>
            </li>
            <li>
              <strong>{T("個別病人 Rx 自動配伍檢查 (Pro)", "Per-patient Rx auto-interaction check (Pro)")}</strong>
              {" — "}
              <span className="font-mono text-emerald-700">evidencebasedtcm.com/pricing</span>
            </li>
            <li>
              <strong>{T("每兩週證據摘要新聞信", "Biweekly evidence digest newsletter")}</strong>
              {" — "}
              <span className="font-mono text-emerald-700">evidencebasedtcm.com/cheatsheet/herb-drug-2026</span>
            </li>
          </ul>

          <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-2 gap-6 text-xs">
            <div>
              <strong>{T("回饋與更新建議", "Feedback & corrections")}</strong>
              <p className="text-slate-600 mt-1">
                {T(
                  "發現遺漏或錯誤？請於 LinkedIn 私訊。每六個月更新一次。",
                  "Found a gap or error? DM on LinkedIn. Revised every 6 months.",
                )}
              </p>
            </div>
            <div>
              <strong>{T("引用本資料", "Citation")}</strong>
              <p className="text-slate-600 mt-1 font-mono leading-snug">
                EBTCM. (2026). Top 25 Herb-Drug Interactions Quick Reference, v2026.05.
                <br/>evidencebasedtcm.com
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            © 2026 EvidenceBasedTCM · {T("自由分發予臨床同行", "Free to share with clinical colleagues")} · v2026.05
          </div>
        </section>
      </div>
    </>
  );
}

function SeverityLegend({ label, zh, cls }: { label: string; zh: string; cls: string }) {
  return (
    <div className={`${cls} border-2 rounded-md px-2 py-1.5 text-center`}>
      <div className="font-bold">{label}</div>
      <div className="text-[10px]">{zh}</div>
    </div>
  );
}

function InteractionRow({
  interaction,
  isZh,
}: {
  interaction: typeof INTERACTIONS[number];
  isZh: boolean;
}) {
  const cls = {
    MAJOR: "sev-major",
    MODERATE: "sev-mod",
    MINOR: "sev-minor",
  }[interaction.severity];
  return (
    <div className={`border-l-4 ${cls} rounded-r pl-2.5 py-1.5 text-[11px] leading-snug`}>
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <div>
          <span className="font-bold text-sm">{interaction.herb.zh}</span>
          <span className="text-slate-500 ml-1.5">{interaction.herb.pinyin}</span>
          <span className="mx-1.5 text-slate-400">×</span>
          <span className="font-semibold">{interaction.drug}</span>
        </div>
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white">
          {interaction.severity}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-slate-700">
        <div>
          <div className="text-[9px] uppercase tracking-wide text-slate-500">Mechanism</div>
          <div>{isZh ? interaction.zh.mechanism : interaction.en.mechanism}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-slate-500">Effect</div>
          <div>{isZh ? interaction.zh.effect : interaction.en.effect}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-slate-500">Management</div>
          <div>{isZh ? interaction.zh.management : interaction.en.management}</div>
        </div>
      </div>
    </div>
  );
}

function FooterStrip() {
  return (
    <div className="mt-auto text-center text-[10px] text-slate-400 pt-6">
      evidencebasedtcm.com · 中藥-西藥交互作用速查表 · v2026.05
    </div>
  );
}
