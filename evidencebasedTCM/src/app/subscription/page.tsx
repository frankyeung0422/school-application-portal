import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { isStripeConfigured } from "@/lib/stripe/client";
import { ManageSubscriptionButton } from "@/components/subscription/ManageSubscriptionButton";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function SubscriptionPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-3">{T("請先登入", "Please sign in")}</h1>
        <Link href="/login" className="rounded-lg bg-primary text-white px-6 py-2 inline-block">
          {T("前往登入", "Sign in")}
        </Link>
      </div>
    );
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });

  const statusLabel = (s: string | undefined): string => {
    switch (s) {
      case "active":     return T("使用中", "Active");
      case "trialing":   return T("試用中", "Trialing");
      case "past_due":   return T("逾期未付", "Past Due");
      case "canceled":   return T("已取消", "Canceled");
      case "incomplete": return T("待付款", "Incomplete");
      default:           return T("未訂閱", "Not subscribed");
    }
  };

  const statusColor = (s: string | undefined) => {
    if (s === "active" || s === "trialing") return "bg-green-100 text-green-800";
    if (s === "past_due" || s === "incomplete") return "bg-amber-100 text-amber-800";
    if (s === "canceled") return "bg-red-100 text-red-800";
    return "bg-slate-100 text-slate-800";
  };

  const tierLabel = (t: string | null | undefined) => {
    if (t === "clinic") return T("診所版", "Clinic");
    if (t === "professional") return T("執業醫師版", "Professional");
    return T("免費版", "Free");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">{T("訂閱管理", "Manage Subscription")}</h1>
      <p className="text-sm text-muted mb-8">
        {T(
          "查看您的訂閱狀態、付款方式與帳單記錄。",
          "View your subscription status, payment method, and billing history.",
        )}
      </p>

      {params.status === "success" && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50/60 dark:bg-green-900/10 p-4">
          <p className="font-medium text-green-800 dark:text-green-300">
            ✅ {T("訂閱成功！您現在可以使用所有 Pro 功能。", "Subscription successful! You now have access to all Pro features.")}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-semibold">{T("當前方案", "Current Plan")}</h2>
          <span className={`text-xs font-semibold rounded-full px-3 py-1 ${statusColor(sub?.status)}`}>
            {statusLabel(sub?.status)}
          </span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted text-xs uppercase tracking-wider mb-0.5">{T("方案等級", "Tier")}</dt>
            <dd className="font-semibold">{tierLabel(sub?.tier)}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs uppercase tracking-wider mb-0.5">{T("帳號角色", "Account Role")}</dt>
            <dd className="font-semibold">{(session.user as { role?: string }).role ?? "PUBLIC"}</dd>
          </div>
          {sub?.currentPeriodEnd && (
            <div>
              <dt className="text-muted text-xs uppercase tracking-wider mb-0.5">
                {sub.cancelAtPeriodEnd
                  ? T("結束於", "Ends on")
                  : T("下次續費", "Next billing")}
              </dt>
              <dd className="font-semibold">
                {new Date(sub.currentPeriodEnd).toLocaleDateString(isZh ? "zh-TW" : "en-US")}
              </dd>
            </div>
          )}
          {sub?.cancelAtPeriodEnd && (
            <div className="sm:col-span-2 text-amber-700 dark:text-amber-400 text-xs">
              ⚠ {T(
                "您的訂閱將於本期結束後取消。仍可使用至上述日期。",
                "Your subscription will cancel at period end. Access continues until the date above.",
              )}
            </div>
          )}
        </dl>

        {sub?.stripeCustomerId && (
          <div className="mt-6 pt-6 border-t border-border">
            <ManageSubscriptionButton locale={locale} />
            <p className="mt-2 text-xs text-muted">
              {T(
                "點擊上方按鈕進入 Stripe 客戶入口，可變更付款方式、升級降級方案、取消訂閱、下載發票。",
                "Click above to open the Stripe Customer Portal — update payment, change plan, cancel, download invoices.",
              )}
            </p>
          </div>
        )}
      </div>

      {!sub?.stripeSubscriptionId && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-8 text-center">
          <h3 className="text-xl font-bold mb-2">
            {T("尚未訂閱付費方案", "No paid subscription yet")}
          </h3>
          <p className="text-sm text-muted mb-6">
            {T(
              "升級至執業醫師版即可使用 AI 處方拍照辨識、處方建構器、病例管理等臨床工具。",
              "Upgrade to Professional to unlock AI prescription scanning, prescription builder, patient cases, and more.",
            )}
          </p>
          <Link href="/pricing" className="rounded-lg bg-primary text-white px-6 py-3 font-semibold inline-block hover:bg-primary-light">
            {T("查看訂閱方案", "View Pricing")}
          </Link>
        </div>
      )}

      {!isStripeConfigured() && (
        <div className="mt-8 rounded-lg border border-amber-300/60 bg-amber-50/40 dark:bg-amber-900/10 p-4 text-xs text-muted">
          ℹ {T(
            "管理員注意：Stripe 未配置。訂閱功能尚未啟用。請在 .env 設定 STRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET 與 price ID。",
            "Admin note: Stripe is not configured. Subscription features are inactive. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and price IDs in .env.",
          )}
        </div>
      )}
    </div>
  );
}
