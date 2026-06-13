"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckoutButton } from "@/components/subscription/CheckoutButton";
import type { Locale } from "@/lib/i18n/types";

interface Props {
  locale: Locale;
  stripeReady: boolean;
}

type Cycle = "monthly" | "annual";

export function PricingTiers({ locale, stripeReady }: Props) {
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const [cycle, setCycle] = useState<Cycle>("monthly");

  // Annual = 15% off (≈ 2 months free), per the commercial plan.
  const ANNUAL_FACTOR = 0.85;

  const proMonthly = 280;
  const proAnnual = Math.round(proMonthly * 12 * ANNUAL_FACTOR); // HK$2,856
  const clinicMonthly = 680;
  const clinicAnnual = Math.round(clinicMonthly * 12 * ANNUAL_FACTOR); // HK$6,936

  const tiers = [
    {
      key: "free" as const,
      name: T("免費版", "Free"),
      tagline: T("學生、研究、好奇病人", "Students, researchers, curious patients"),
      monthly: 0,
      annual: 0,
      featured: false,
      features: [
        T("瀏覽全部中藥 / 方劑 / 穴位資料庫", "Browse all herbs / formulas / acupoints"),
        T("公開中藥-西藥交互查詢（無限次）", "Public herb-drug interaction checker (unlimited)"),
        T("食療食譜資料庫", "Food therapy recipe database"),
        T("王琦 9 體質測試（匿名）", "Wang Qi 9-Constitution test (anonymous)"),
        T("辨證論治嚮導 + 病症映射", "Symptom-pattern wizard + condition mapping"),
        T("707+ GRADE 評級證據瀏覽", "707+ GRADE-rated evidence library"),
      ],
      missingHint: T("無病人病歷管理 · 無處方建構器", "No patient records · No Rx builder"),
      cta: T("免費註冊", "Sign Up Free"),
      ctaHref: "/register",
      tierKey: null as null,
    },
    {
      key: "pro" as const,
      name: T("執業醫師 Pro", "Professional"),
      tagline: T("個體中醫師 / 整合醫學 MD", "Solo TCM practitioners / Integrative MDs"),
      monthly: proMonthly,
      annual: proAnnual,
      featured: true,
      features: [
        T("免費版全部功能", "Everything in Free"),
        T("✨ 病人病歷管理（無限制）", "✨ Patient records (unlimited)"),
        T("✨ 四診 / SOAP 雙模式病歷", "✨ Dual-mode charts: TCM 四診 / SOAP"),
        T("✨ 處方建構器 + 自動劑量計算", "✨ Rx builder + auto-dosing"),
        T("✨ 中藥-西藥自動配伍警示", "✨ Auto interaction warnings on Rx save"),
        T("✨ 舌相上傳 + 影像比對", "✨ Tongue photo upload + comparison"),
        T("✨ 生命徵象趨勢圖表", "✨ Vitals trend charts"),
        T("✨ AI 處方拍照辨識（每月 200 次）", "✨ AI Rx photo analysis (200/mo)"),
        T("✨ PDF 處方列印（診所抬頭）", "✨ PDF Rx printing with clinic letterhead"),
        T("✨ 病人衛教單張產生", "✨ Patient handout generation"),
      ],
      missingHint: null,
      cta: T("14 天免費試用", "Start 14-day Free Trial"),
      ctaHref: "/register?plan=professional",
      tierKey: "professional" as const,
    },
    {
      key: "clinic" as const,
      name: T("診所版", "Clinic"),
      tagline: T("2–5 位醫師的診所團隊", "Clinics with 2–5 practitioners"),
      monthly: clinicMonthly,
      annual: clinicAnnual,
      featured: false,
      features: [
        T("Pro 全部功能 × 5 位醫師", "Everything in Pro × 5 practitioners"),
        T("⭐ 多人協作：共享病人檔案", "⭐ Multi-practitioner: shared patient records"),
        T("⭐ 診所角色：負責人 / 醫師 / 接待員", "⭐ Roles: Owner / Practitioner / Receptionist"),
        T("⭐ 完整審計日誌（HIPAA 風格）", "⭐ Full HIPAA-style audit log"),
        T("⭐ 雙因素驗證（TOTP 2FA）", "⭐ Two-factor authentication (TOTP)"),
        T("⭐ 內部轉介系統（時限制權限）", "⭐ Internal referral system (time-boxed access)"),
        T("⭐ AI 服務無上限", "⭐ Unlimited AI usage"),
        T("⭐ 月結發票", "⭐ Monthly invoicing supported"),
        T("⭐ 優先電郵支援（8 小時內）", "⭐ Priority email support (<8h)"),
      ],
      missingHint: null,
      cta: T("訂閱診所版", "Subscribe to Clinic"),
      ctaHref: "/register?plan=clinic",
      tierKey: "clinic" as const,
    },
  ];

  return (
    <>
      {/* Cycle toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-surface border border-border rounded-full p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`px-5 py-2 text-sm rounded-full transition-colors font-medium ${
              cycle === "monthly" ? "bg-primary text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {T("月付", "Monthly")}
          </button>
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`px-5 py-2 text-sm rounded-full transition-colors font-medium ${
              cycle === "annual" ? "bg-primary text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {T("年付", "Annual")}
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
              {T("省 15%", "Save 15%")}
            </span>
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const price = cycle === "annual" ? tier.annual : tier.monthly;
          const isFree = tier.key === "free";
          const hkPrice = isFree
            ? T("免費", "Free")
            : `HK$${price.toLocaleString()}`;
          const period = isFree
            ? T("永久免費", "forever")
            : cycle === "annual"
              ? T("/ 年", "/ year")
              : T("/ 月", "/ month");

          return (
            <div
              key={tier.key}
              className={`rounded-2xl border p-6 flex flex-col ${
                tier.featured
                  ? "border-primary border-2 bg-primary/5 relative shadow-lg"
                  : "border-border bg-surface"
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-white text-xs font-semibold px-3 py-1">
                  {T("最熱門", "Most Popular")}
                </div>
              )}
              <h2 className="text-xl font-bold mb-1">{tier.name}</h2>
              <p className="text-xs text-muted mb-4 leading-relaxed h-8">{tier.tagline}</p>
              <div className="mb-1">
                <span className="text-4xl font-bold">{hkPrice}</span>
                <span className="text-sm text-muted ml-1">{period}</span>
              </div>
              {!isFree && cycle === "annual" && (
                <div className="text-xs text-emerald-600 mb-4">
                  {T(
                    `等於每月 HK$${Math.round(tier.annual / 12).toLocaleString()} · 年付省 HK$${(tier.monthly * 12 - tier.annual).toLocaleString()}`,
                    `≈ HK$${Math.round(tier.annual / 12).toLocaleString()}/mo · Save HK$${(tier.monthly * 12 - tier.annual).toLocaleString()}`,
                  )}
                </div>
              )}
              {!isFree && cycle === "monthly" && (
                <div className="text-xs text-muted mb-4">
                  {T("可隨時取消", "Cancel any time")}
                </div>
              )}
              {isFree && <div className="mb-4" />}

              <ul className="space-y-2 mb-3 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-primary shrink-0 mt-0.5">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {tier.missingHint && (
                <p className="text-[11px] text-muted italic mb-3">{tier.missingHint}</p>
              )}

              {tier.tierKey && stripeReady ? (
                <CheckoutButton
                  tier={tier.tierKey}
                  className={`block w-full text-center rounded-lg py-2.5 font-semibold transition-colors cursor-pointer ${
                    tier.featured
                      ? "bg-primary text-white hover:bg-primary-light"
                      : "border border-border hover:bg-surface"
                  }`}
                >
                  {tier.cta}
                </CheckoutButton>
              ) : (
                <Link
                  href={tier.ctaHref}
                  className={`block text-center rounded-lg py-2.5 font-semibold transition-colors ${
                    tier.featured
                      ? "bg-primary text-white hover:bg-primary-light"
                      : "border border-border hover:bg-surface"
                  }`}
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {!stripeReady && (
        <p className="text-center text-xs text-muted mt-4">
          {T(
            "註：付款功能設定中，目前點擊「訂閱」會引導您到註冊頁面。",
            "Note: Payment integration in setup; subscribe buttons currently route to sign-up.",
          )}
        </p>
      )}
    </>
  );
}
