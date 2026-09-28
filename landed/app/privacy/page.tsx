import { PageTitle } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed">
      <PageTitle title="私隱政策 Privacy notice" sub="《個人資料（私隱）條例》(Cap. 486) Personal Data (Privacy) Ordinance" />
      <div className="card space-y-3 p-6">
        <p><b>收集咩資料：</b>電郵、密碼（加密儲存）、送貨姓名電話地址、減價通知設定、點擊紀錄。付款卡資料由 Stripe 處理，我哋唔會接觸。</p>
        <p><b>用途：</b>處理訂單及拼單、向供應商及物流提供送貨資料、發送你要求嘅減價通知、防止詐騙。</p>
        <p><b>位置：</b>「最近分店」功能只會喺你撳制之後先向瀏覽器攞一次位置，用嚟計附近分店距離，之後只保留喺你部機嘅 session 記憶體，我哋唔會儲存或記錄。Location is requested only when you tap “find nearest”, used for that lookup, and never stored on our servers.</p>
        <p><b>轉移：</b>送貨資料只會提供俾完成你訂單所需嘅供應商、集運公司及派送公司。</p>
        <p><b>查閱及更正：</b>你可以隨時要求查閱、更正或刪除你嘅資料；每封減價通知都有取消連結。</p>
        <p className="text-slate-500">
          We collect only what is needed to fulfil orders and alerts, share delivery details only with the parties who deliver your order, never see card numbers (handled by Stripe), and honour access, correction and deletion requests.
        </p>
      </div>
    </div>
  );
}
