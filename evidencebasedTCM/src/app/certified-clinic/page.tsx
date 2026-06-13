import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { CertifiedClinicForm } from "@/components/marketing/CertifiedClinicForm";

export const metadata = {
  title: "EBTCM 認證診所計劃 · EBTCM Certified Clinic Program",
  description:
    "經過 EBTCM 培訓的診所獲得官方徽章、平台目錄收錄與年度安全用藥審計。年費 HK$5,000（首批 8 折）。",
};

export default async function CertifiedClinicPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-4 py-1.5 text-xs font-medium">
          🏅 {T("首批 10 間診所限定 8 折優惠", "Founding 10 clinics — 20% off")}
        </div>
        <h1 className="text-4xl font-bold mb-3 leading-tight">
          {T("EBTCM 認證診所計劃", "EBTCM Certified Clinic Program")}
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          {T(
            "向您的病人證明：本診所採用 GRADE 評級證據，並通過中藥-西藥安全配伍流程訓練。",
            "Show your patients that your clinic uses GRADE-rated evidence and has been trained in herb-drug safety protocols.",
          )}
        </p>
      </div>

      {/* What you get — 4 pillars */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-12">
        {[
          {
            icon: "🎓",
            title: T("臨床安全培訓", "Clinical Safety Training"),
            body: T(
              "5 小時線上培訓涵蓋中藥-西藥配伍、妊娠/哺乳/兒童禁忌、四診-SOAP 雙模式記錄。團隊全員需通過考核。",
              "5-hour online training: herb-drug interactions, pregnancy/lactation/pediatric safety, dual-mode TCM/SOAP documentation. All clinic members must pass assessment.",
            ),
          },
          {
            icon: "✅",
            title: T("數位認證徽章", "Verified Digital Badge"),
            body: T(
              "可嵌入診所網頁、Google Business Profile、Facebook 專頁。連結到平台上的可驗證認證狀態頁。",
              "Embeddable on clinic website, Google Business Profile, Facebook page. Links to a verifiable status page on EBTCM.",
            ),
          },
          {
            icon: "📍",
            title: T("平台目錄收錄", "Platform Directory Listing"),
            body: T(
              "在 EvidenceBasedTCM.com /certified-clinics 目錄列名，含診所介紹、專長、聯絡方式。SEO 友善。",
              "Listed at EvidenceBasedTCM.com/certified-clinics with clinic profile, specialties, and contact info. SEO-friendly.",
            ),
          },
          {
            icon: "📊",
            title: T("年度安全審計報告", "Annual Safety Audit Report"),
            body: T(
              "我們審視貴診所過去 12 個月（去識別化）處方數據，產出客製化「用藥安全趨勢」報告，可用於 CME 申報或內部教學。",
              "We review your clinic's anonymized prescription patterns over 12 months and deliver a custom safety-trend report — usable for CME credit or internal teaching.",
            ),
          },
        ].map((p, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5">
            <div className="text-3xl mb-3">{p.icon}</div>
            <h3 className="font-semibold mb-2 leading-snug">{p.title}</h3>
            <p className="text-sm text-muted leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>

      {/* Pricing block */}
      <div className="rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-900/15 dark:to-teal-900/10 p-8 mb-12">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-3">
              {T("年費 HK$5,000", "HK$5,000 / year")}
            </h2>
            <p className="text-base text-emerald-700 dark:text-emerald-300 font-semibold mb-2">
              {T(
                "🏅 首批 10 間診所 8 折：HK$4,000 / 年",
                "🏅 First 10 clinics: HK$4,000 / year (20% off)",
              )}
            </p>
            <p className="text-sm text-muted mb-4 leading-relaxed">
              {T(
                "包括完整培訓、無限次考核重試、年度審計報告、目錄收錄、徽章授權。每年續約 — 取消後徽章效期至年底。",
                "Includes full training, unlimited reassessments, annual audit report, directory listing, badge license. Renewable yearly — cancellation keeps badge active through year-end.",
              )}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted">
                <span className="text-emerald-600">✓</span>
                {T("可與 EBTCM Pro / Clinic 訂閱合併", "Bundles with EBTCM Pro / Clinic subscription")}
              </div>
              <div className="flex items-center gap-2 text-muted">
                <span className="text-emerald-600">✓</span>
                {T("分期付款：HK$1,000 × 4 季", "Quarterly payments available: HK$1,000 × 4")}
              </div>
              <div className="flex items-center gap-2 text-muted">
                <span className="text-emerald-600">✓</span>
                {T("年費滿意保證：30 日內可全額退款", "30-day satisfaction guarantee — full refund")}
              </div>
            </div>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/40 rounded-xl p-6 border border-emerald-200/50">
            <h3 className="font-bold mb-3 text-lg">
              {T("適合甚麼樣的診所？", "Who is this for?")}
            </h3>
            <ul className="space-y-2 text-sm leading-relaxed">
              <li>· {T("已有 EBTCM Pro / Clinic 訂閱的診所", "Clinics already on EBTCM Pro / Clinic")}</li>
              <li>· {T("正在差異化品牌的中醫師", "TCM practitioners differentiating their brand")}</li>
              <li>· {T("計劃接保險公司轉介的診所", "Clinics aiming to receive insurance referrals")}</li>
              <li>· {T("教學診所與大專附設診所", "Teaching clinics & university-affiliated clinics")}</li>
              <li>· {T("有計劃申請 CME 的執業機構", "Practices planning to apply for CME accreditation")}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* How it works — 4 steps */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {T("認證流程 · 4 步驟", "How it works · 4 steps")}
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              n: 1,
              title: T("提交申請", "Apply"),
              body: T("填寫下方表格，5 分鐘。", "Fill the form below — 5 min."),
            },
            {
              n: 2,
              title: T("線上培訓 (5 小時)", "Online training (5 hrs)"),
              body: T(
                "可分多次完成，3 個月內。模組含中藥-西藥安全、四診-SOAP 文件、處方建構。",
                "Self-paced over 3 months. Modules: herb-drug safety, dual-mode documentation, Rx building.",
              ),
            },
            {
              n: 3,
              title: T("團隊考核", "Team assessment"),
              body: T(
                "線上 30 題情境考核，70 分通過。失敗可無限次重考。",
                "30-question online scenario assessment, 70% to pass. Unlimited retakes.",
              ),
            },
            {
              n: 4,
              title: T("授予認證", "Certification awarded"),
              body: T(
                "通過後 5 個工作日內收到徽章 + 平台目錄收錄。年度審計於滿 12 個月後進行。",
                "Within 5 business days of passing: badge + directory listing. Annual audit at month 12.",
              ),
            },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-surface p-5">
              <div className="text-3xl font-bold text-emerald-600 mb-2">{s.n}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Marketing value for clinics */}
      <div className="rounded-2xl bg-surface border border-border p-8 mb-12">
        <h2 className="text-xl font-bold mb-4 text-center">
          {T("這對您診所的營銷價值", "Marketing value for your clinic")}
        </h2>
        <div className="grid gap-6 md:grid-cols-3 text-sm">
          <div>
            <h3 className="font-semibold mb-2">{T("差異化定位", "Differentiation")}</h3>
            <p className="text-muted leading-relaxed">
              {T(
                "在 HK 8,000+ 中醫師中，認證徽章立即告訴病人您採用實證標準 — 不是「自稱專業」，而是「第三方驗證」。",
                "Among HK's 8,000+ TCM practitioners, the badge instantly signals to patients that you use evidence-based standards — third-party verified, not self-claimed.",
              )}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">{T("提高轉介率", "Higher referral rates")}</h3>
            <p className="text-muted leading-relaxed">
              {T(
                "認證診所優先納入我們向西醫合作夥伴推薦的清單。整合醫學 MD 較願意把病人轉介給「我能驗證資質」的中醫師。",
                "Certified clinics are prioritized in referrals to Western MD partners. Integrative MDs prefer referring to TCM practitioners they can verify.",
              )}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">{T("保險合作優先", "Insurance partner priority")}</h3>
            <p className="text-muted leading-relaxed">
              {T(
                "我們正與 HK 保險公司洽談 TCM 福利方案 — 認證診所是優先合作對象，可直接接收保險客戶。",
                "We're in talks with HK insurers on TCM benefit programs. Certified clinics are the priority partners for direct insurance-paid referrals.",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Application form */}
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 md:p-8 mb-12">
        <h2 className="text-2xl font-bold mb-2">
          {T("申請認證 — 5 分鐘表格", "Apply for Certification — 5 min form")}
        </h2>
        <p className="text-sm text-muted mb-5">
          {T(
            "提交後我們在 3 個工作日內回覆。首批 10 間 8 折優惠 — 名額剩 [N] 間（每週更新）。",
            "We reply within 3 business days. First 10 clinics get 20% off — [N] slots remaining (updated weekly).",
          )}
        </p>
        <CertifiedClinicForm locale={locale} />
      </div>

      {/* FAQ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {T("常見問題", "FAQ")}
        </h2>
        <div className="max-w-3xl mx-auto space-y-3">
          {[
            {
              q: T("我們診所只有一位醫師 — 也可以申請嗎？", "Can solo practitioners apply?"),
              a: T(
                "可以。「認證診所」適用所有規模，從個體執業到 20+ 位醫師團隊。單人診所通常 1–2 週完成培訓。",
                "Yes. The program works for all sizes — solo to 20+ practitioners. Solo clinics typically finish training in 1-2 weeks.",
              ),
            },
            {
              q: T("失去認證的可能情況是？", "When could certification be revoked?"),
              a: T(
                "兩種情況：(1) 拒絕參加年度審計；(2) 被投訴並查實重大用藥安全違規（從未發生）。撤銷前我們會給 60 日改善期。",
                "Two cases: (1) refusal to participate in annual audit; (2) substantiated serious safety violations (has never happened). 60-day improvement period before revocation.",
              ),
            },
            {
              q: T("徽章可以放在哪裡？", "Where can I display the badge?"),
              a: T(
                "診所網站、Google Business、Facebook、Instagram、印刷宣傳品、診所大堂。我們提供 PDF、PNG、SVG 三種格式。",
                "Clinic website, Google Business, Facebook, Instagram, printed materials, clinic lobby. We provide PDF, PNG, and SVG formats.",
              ),
            },
            {
              q: T("與其他中醫公會認證的差別？", "How is this different from TCM association certifications?"),
              a: T(
                "我們的認證不涉及執業資格（那是中醫師管理委員會的責任）。我們認證的是「採用實證標準的工作流程」 — 涵蓋現代中藥-西藥安全議題，而非傳統師承體系。",
                "Our certification doesn't cover licensing (that's the Chinese Medicine Council's role). We certify evidence-based workflow adoption — covering modern herb-drug safety, not traditional lineage.",
              ),
            },
            {
              q: T("我已經是 EBTCM Pro 訂戶 — 有任何優惠嗎？", "I'm already an EBTCM Pro subscriber — any discount?"),
              a: T(
                "有。現有訂戶享有 15% 額外折扣（與首批優惠可疊加）。Clinic 版訂戶享 25% 折扣。請於申請表填寫您的 EBTCM 帳號電郵。",
                "Yes. Existing subscribers get an extra 15% off (stacks with founding-10 discount). Clinic plan subscribers get 25% off. Fill in your EBTCM account email in the form.",
              ),
            },
          ].map((item, i) => (
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

      {/* Cross-link footer */}
      <div className="text-center text-sm text-muted">
        {T("還沒準備好認證？先試", "Not ready for certification? Try ")}
        <Link href="/pricing" className="text-primary hover:underline font-medium">
          {T("EBTCM Pro / Clinic 訂閱", "EBTCM Pro / Clinic subscription")}
        </Link>
        {T("，使用 14 天後再決定。", " — 14 days free, then decide.")}
      </div>
    </div>
  );
}
