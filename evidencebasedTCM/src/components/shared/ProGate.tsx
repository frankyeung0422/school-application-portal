import Link from "next/link";
import { getCurrentTier, tierAtLeast, type Tier } from "@/lib/auth/tier";
import { getLocale } from "@/lib/i18n/locale-server";

/**
 * Server-side gating component. Wrap any Pro-only feature in <ProGate need="professional">…</ProGate>.
 * If the current user's tier is sufficient, the children render. Otherwise,
 * a friendly upgrade card is shown in their place.
 *
 *   <ProGate need="professional">
 *     <PrescriptionBuilder />
 *   </ProGate>
 */

interface Props {
  need?: Tier;
  children: React.ReactNode;
  /** Optional title shown in the locked card. */
  feature?: string;
  /** Optional 1-line description shown in the locked card. */
  description?: string;
}

export async function ProGate({
  need = "professional",
  children,
  feature,
  description,
}: Props) {
  const have = await getCurrentTier();
  if (tierAtLeast(have, need)) return <>{children}</>;

  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const tierName = need === "clinic"
    ? T("診所版", "Clinic")
    : T("執業醫師版", "Professional");

  return (
    <div className="rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 p-8 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <h3 className="text-xl font-bold mb-2">
        {feature ?? T("此功能需訂閱", "This feature requires a subscription")}
      </h3>
      {description && (
        <p className="text-sm text-muted leading-relaxed max-w-xl mx-auto mb-4">
          {description}
        </p>
      )}
      <p className="text-sm text-muted leading-relaxed max-w-xl mx-auto mb-6">
        {T(
          `升級至 ${tierName} 即可解鎖此工具與其他臨床決策功能。`,
          `Upgrade to ${tierName} to unlock this tool and the rest of the clinical workflow.`,
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/pricing"
          className="rounded-lg bg-primary text-white px-6 py-2.5 font-semibold hover:bg-primary-light transition-colors"
        >
          {T("查看訂閱方案", "View Pricing")}
        </Link>
        <Link
          href="/register?plan=professional"
          className="rounded-lg border border-amber-400/40 bg-white/60 dark:bg-transparent px-6 py-2.5 text-sm hover:bg-white transition-colors"
        >
          {T("免費試用 14 天", "Start 14-day Free Trial")}
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted">
        {T("無需信用卡 · 隨時取消", "No credit card required · Cancel anytime")}
      </p>
    </div>
  );
}
