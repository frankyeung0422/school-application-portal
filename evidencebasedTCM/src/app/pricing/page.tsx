import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { isStripeConfigured } from "@/lib/stripe/client";
import { PricingTiers } from "@/components/subscription/PricingTiers";

export const metadata = {
  title: "Pricing — EBTCM Clinical Decision Support",
  description: "個人 Pro / 診所版 / 企業版 — HK$280 起。整合 707+ GRADE 證據的中醫臨床決策平台。",
};

export default async function PricingPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const stripeReady = isStripeConfigured();

  const guarantees = [
    T("✅ 14 天免費試用，無需信用卡", "✅ 14-day free trial, no credit card required"),
    T("✅ 隨時取消，按比例退款", "✅ Cancel anytime, prorated refund"),
    T("✅ 患者資料端對端加密儲存", "✅ End-to-end encrypted patient data"),
    T("✅ 符合 HIPAA 與 GDPR 合規標準", "✅ HIPAA & GDPR compliant"),
    T("✅ 繁簡中文 + 英文介面", "✅ Traditional/Simplified Chinese + English UI"),
  ];

  const faq = [
    {
      q: T("月付 vs. 年付差別在哪？", "Monthly vs. Annual — what's the difference?"),
      a: T(
        "年付方案折扣 15%（相當於每年送 2 個月）。月付靈活、隨時取消；年付鎖定價格 12 個月並有更高客戶優先支援。",
        "Annual plans save 15% (≈ 2 months free). Monthly is flexible — cancel any time. Annual locks pricing for 12 months and includes priority support.",
      ),
    },
    {
      q: T("我可以從免費版升級嗎？", "Can I upgrade from Free?"),
      a: T(
        "可以。所有用戶資料（書籤、學習進度）無縫保留，升級後即時可用 Pro 功能。",
        "Yes — all your data carries over seamlessly. Pro features unlock instantly.",
      ),
    },
    {
      q: T("診所版多人帳號如何運作？", "How does the Clinic multi-user plan work?"),
      a: T(
        "診所負責人為 OWNER，可邀請最多 5 位 PRACTITIONER 或 RECEPTIONIST 加入。所有成員共享病人檔案，但個人病歷由各自醫師負責。OWNER 可查看完整審計日誌。",
        "Clinic owner is OWNER and can invite up to 5 PRACTITIONER or RECEPTIONIST members. All members share patient records; individual consultations remain attributed to the writing physician. OWNER can view full audit log.",
      ),
    },
    {
      q: T("如果我們診所有 10 位以上醫師？", "What if my clinic has 10+ physicians?"),
      a: T(
        "請選擇企業版。我們會根據您的規模、需求與整合複雜度提供報價（通常 HK$3,000-8,000/月）。",
        "Choose Enterprise. We'll quote based on your size, requirements, and integration complexity (typically HK$3,000-8,000/month).",
      ),
    },
    {
      q: T("AI 處方拍照辨識準確度？", "How accurate is the AI prescription photo analysis?"),
      a: T(
        "使用 OpenAI GPT-4o 或 Anthropic Claude Opus 視覺模型，搭配 220+ 中藥詞彙錨點。對清晰列印 >95%，工整手寫 >85%。結果仍需醫師最終判斷。",
        "Powered by OpenAI GPT-4o / Anthropic Claude Opus vision with a 220+ herb vocabulary anchor. >95% on clear print, >85% on neat handwriting. Output is informational — physician judgment remains final.",
      ),
    },
    {
      q: T("支援哪些付款方式？", "What payment methods do you support?"),
      a: T(
        "信用卡（Visa / MasterCard / AmEx）、Stripe、PayPal、銀行轉帳。診所與企業方案另支援月結發票。",
        "Credit cards (Visa/MC/Amex), Stripe, PayPal, bank transfer. Clinic and Enterprise plans support invoiced monthly billing.",
      ),
    },
    {
      q: T("資料保密如何保證？", "How do you protect patient confidentiality?"),
      a: T(
        "所有患者資料端對端加密。AI 影像分析不會儲存於伺服器（僅於記憶體中處理）。符合 HIPAA、GDPR 與香港個資條例。",
        "All patient data end-to-end encrypted. AI image analysis is never persisted to server (in-memory only). Compliant with HIPAA, GDPR, and Hong Kong PDPO.",
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          {T("為臨床醫師打造的決策支援", "Built for Practicing Clinicians")}
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          {T(
            "707+ 條 GRADE 評級證據 · 220+ 中藥 · 中藥-西藥安全自動配伍 · 四診/SOAP 雙模式病歷。",
            "707+ GRADE-rated evidence · 220+ herbs · automated herb-drug safety · TCM 四診 + SOAP dual-mode charts.",
          )}
        </p>
      </div>

      {/* 3-tier pricing with monthly/annual toggle */}
      <PricingTiers locale={locale} stripeReady={stripeReady} />

      {/* Enterprise contact-sales row */}
      <div className="mt-8 rounded-2xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-50/40 to-orange-50/40 dark:from-amber-900/10 dark:to-orange-900/10 p-6 md:p-8 mb-12">
        <div className="grid gap-4 md:grid-cols-[1fr,auto] items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-semibold">
                {T("企業版", "Enterprise")}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                {T("醫院 / 大型診所 / 保險公司", "Hospitals / Large clinics / Insurers")}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {T("為 10+ 醫師的機構量身打造", "Tailored for 10+ practitioner organizations")}
            </h2>
            <p className="text-sm text-muted leading-relaxed mb-3">
              {T(
                "包含診所版全部功能，加上：客製化品牌、API 存取、SLA 保證、私有資料庫部署、CME 培訓模組、單一登入（SSO）、客戶成功經理。",
                "Everything in Clinic, plus: custom branding, API access, SLA guarantees, private data deployment, CME training modules, SSO, dedicated customer success manager.",
              )}
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <span>· {T("HK$3,000–8,000 / 月起", "From HK$3,000–8,000 / month")}</span>
              <span>· {T("年合約 + 簽約優惠", "Annual contract + signing discount")}</span>
              <span>· {T("實施時間 2–6 週", "Implementation 2–6 weeks")}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="mailto:enterprise@evidencebasedtcm.com?subject=Enterprise%20Inquiry%20-%20[Your%20Clinic%20Name]"
              className="block text-center rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 transition-colors whitespace-nowrap"
            >
              {T("聯絡銷售團隊", "Contact Sales")}
            </Link>
            <Link
              href="/enterprise/inquiry"
              className="block text-center rounded-lg border border-amber-400/50 text-amber-700 dark:text-amber-300 font-medium px-6 py-2 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              {T("填寫詢問表格", "Inquiry form")}
            </Link>
          </div>
        </div>
      </div>

      {/* Certified Clinic program cross-link */}
      <div className="mb-12 rounded-2xl border border-emerald-400/40 bg-emerald-50/40 dark:bg-emerald-900/10 p-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[14rem]">
          <h3 className="font-semibold mb-1">
            🏅 {T("EBTCM 認證診所計劃", "EBTCM Certified Clinic Program")}
          </h3>
          <p className="text-sm text-muted leading-relaxed">
            {T(
              "經訓練的診所獲得官方徽章、平台目錄收錄、年度安全用藥審計報告。年費 HK$5,000（首批 8 折優惠）。",
              "Trained clinics get a verification badge, platform directory listing, and annual safety audit. HK$5,000/year (20% off for first 10 clinics).",
            )}
          </p>
        </div>
        <Link
          href="/certified-clinic"
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 text-sm whitespace-nowrap"
        >
          {T("了解詳情 →", "Learn more →")}
        </Link>
      </div>

      {/* Guarantees row */}
      <div className="rounded-2xl border border-border bg-surface/50 p-6 mb-12">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {guarantees.map((g, i) => (
            <div key={i} className="text-muted">{g}</div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {T("為您的工作流程而設計", "Designed for Your Workflow")}
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🩺",
              title: T("門診中即時查詢", "Real-time at point-of-care"),
              body: T(
                "5 秒內完成中藥-西藥配伍檢查、ICD 對應、相關 RCT 推薦 — 患者還在診間。",
                "Drug compatibility check, ICD-code matching, relevant RCT lookup in 5 seconds — while the patient is still in the room.",
              ),
            },
            {
              icon: "📋",
              title: T("四診 / SOAP 雙模式", "TCM 四診 / SOAP dual mode"),
              body: T(
                "同一份病歷可切換四診（中醫師）或 SOAP（西醫）格式 — 為轉介與會診而設計。",
                "Toggle between TCM 四診 and Western SOAP on the same chart — designed for referrals and co-management.",
              ),
            },
            {
              icon: "📸",
              title: T("AI 處方拍照辨識", "AI prescription photo analysis"),
              body: T(
                "拍攝其他醫師處方，AI 即解析藥物組成、配伍禁忌與適應症 — 跨機構延續用藥。",
                "Photo a colleague's prescription → AI parses composition, flags conflicts, surfaces likely uses.",
              ),
            },
            {
              icon: "🧬",
              title: T("王琦 9 體質辨識", "Wang Qi 9-Constitution Typing"),
              body: T(
                "36 題簡化版 CCMI 評估，1-on-1 病人測試後存入病歷，追蹤體質演變。",
                "36-item CCMI assessment; results save to chart and track constitution evolution over visits.",
              ),
            },
            {
              icon: "🛡️",
              title: T("自動配伍警示", "Auto interaction warnings"),
              body: T(
                "處方儲存時自動對照病人西藥清單，跳出嚴重度評級警示 + 處置建議。",
                "On Rx save, auto-cross-reference patient's Western meds → severity-graded warnings + management advice.",
              ),
            },
            {
              icon: "🌐",
              title: T("繁簡中文 + 英文", "Bilingual UI"),
              body: T(
                "全平台支援繁體、簡體與英文無縫切換。臨床術語經過審慎標準化。",
                "Full Traditional / Simplified Chinese / English. Clinical terminology carefully standardized.",
              ),
            },
          ].map((u, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-5">
              <div className="text-3xl mb-3">{u.icon}</div>
              <h3 className="font-semibold mb-2">{u.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {T("常見問題", "Frequently Asked Questions")}
        </h2>
        <div className="max-w-3xl mx-auto space-y-3">
          {faq.map((item, i) => (
            <details key={i} className="rounded-lg border border-border bg-surface p-4 group">
              <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                <span>{item.q}</span>
                <span className="text-muted transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="mt-3 text-sm text-muted leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-12 border border-primary/20">
        <h2 className="text-3xl font-bold mb-3">
          {T("還在猶豫？", "Still on the fence?")}
        </h2>
        <p className="text-lg text-muted max-w-xl mx-auto mb-6">
          {T(
            "免費試用 14 天，看看 EBTCM 如何讓您每天節省 30+ 分鐘的查證時間，並攔下每月至少一次潛在的中藥-西藥用藥風險。",
            "Try Pro free for 14 days. See how EBTCM saves 30+ min/day on evidence lookup and catches at least one herb-drug risk per month.",
          )}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/register?plan=professional"
            className="inline-block rounded-lg bg-primary text-white px-8 py-3 font-semibold hover:bg-primary-light transition-colors"
          >
            {T("開始 14 天免費試用 →", "Start 14-day Free Trial →")}
          </Link>
          <Link
            href="/demo"
            className="inline-block rounded-lg border border-border bg-background px-8 py-3 font-semibold hover:bg-surface transition-colors"
          >
            {T("預約 15 分鐘示範", "Book a 15-min Demo")}
          </Link>
        </div>
      </div>
    </div>
  );
}
