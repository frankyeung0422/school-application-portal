import { auth } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { CpdCertificateDownload } from "@/components/learn/CpdCertificateDownload";

export const metadata = { title: "持續進修記錄 (CPD) — EBTCM" };

const ALLOWED_ROLES = ["PRACTITIONER", "RESEARCHER", "EDITOR", "ADMIN"];

const ACTIVITY_LABELS: Record<string, string> = {
  evidence_read: "研讀實證",
  lesson_complete: "完成課程",
  case_submit: "提交病案",
  research_review: "審閱研究",
};

const ACTIVITY_ICONS: Record<string, string> = {
  evidence_read: "📄",
  lesson_complete: "🎓",
  case_submit: "📋",
  research_review: "🔬",
};

export default async function CpdPage() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!user?.id) redirect("/login?callbackUrl=/learn/cpd");
  if (!user.role || !ALLOWED_ROLES.includes(user.role)) redirect("/learn");

  const activities = await prisma.cpdActivity.findMany({
    where: { userId: user.id },
    orderBy: { earnedAt: "desc" },
  });

  const totalCredits = Math.round(activities.reduce((s, a) => s + a.credits, 0) * 10) / 10;
  const thisYear = new Date().getFullYear();
  const yearCredits = Math.round(
    activities
      .filter((a) => new Date(a.earnedAt).getFullYear() === thisYear)
      .reduce((s, a) => s + a.credits, 0) * 10
  ) / 10;

  const byType = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.activityType] = Math.round(((acc[a.activityType] ?? 0) + a.credits) * 10) / 10;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/learn" className="text-sm text-muted hover:text-foreground">← 學習中心</Link>
        <h1 className="text-2xl font-bold mt-1">持續進修記錄 (CPD)</h1>
        <p className="text-sm text-muted mt-1">
          自動記錄您在平台上的進修活動。1 學分 ≈ 1 小時進修時數，可用於向香港中醫藥管理委員會或其他認證機構申報。
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <div className="text-2xl font-bold text-primary tabular-nums">{totalCredits}</div>
          <div className="text-xs text-muted mt-0.5">累計學分</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <div className="text-2xl font-bold tabular-nums">{yearCredits}</div>
          <div className="text-xs text-muted mt-0.5">{thisYear} 年學分</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <div className="text-2xl font-bold tabular-nums">{activities.length}</div>
          <div className="text-xs text-muted mt-0.5">活動次數</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <div className="text-2xl font-bold tabular-nums">{Object.keys(byType).length}</div>
          <div className="text-xs text-muted mt-0.5">活動類別</div>
        </div>
      </div>

      {/* Certificate download */}
      {totalCredits > 0 && (
        <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-emerald-900">進修證書</p>
            <p className="text-sm text-emerald-800 mt-0.5">
              下載包含本年度所有 CPD 活動的進修證明，適用於執照更新及機構申報。
            </p>
          </div>
          <CpdCertificateDownload
            name={user.name ?? ""}
            totalCredits={yearCredits}
            year={thisYear}
            activityCount={activities.filter((a) => new Date(a.earnedAt).getFullYear() === thisYear).length}
          />
        </div>
      )}

      {/* Activity breakdown by type */}
      {Object.keys(byType).length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(byType).map(([type, credits]) => (
            <div key={type} className="rounded-xl border border-border bg-surface p-3 text-center">
              <div className="text-xl mb-1">{ACTIVITY_ICONS[type] ?? "📌"}</div>
              <div className="text-sm font-semibold tabular-nums">{credits} 學分</div>
              <div className="text-xs text-muted">{ACTIVITY_LABELS[type] ?? type}</div>
            </div>
          ))}
        </div>
      )}

      {/* Activity log */}
      {activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted">尚無進修記錄。</p>
          <p className="text-sm text-muted mt-1">閱讀實證研究、完成課程或提交病案後，活動將自動記錄在此。</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link href="/evidence" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
              瀏覽實證 →
            </Link>
            <Link href="/learn" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
              學習課程 →
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-base font-semibold mb-3">進修活動記錄</h2>
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{ACTIVITY_ICONS[a.activityType] ?? "📌"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted">
                      {ACTIVITY_LABELS[a.activityType] ?? a.activityType} ·{" "}
                      {new Date(a.earnedAt).toLocaleDateString("zh-HK")}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary shrink-0 tabular-nums">
                  +{a.credits} 學分
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-muted border-t border-border pt-4">
        * 本平台的 CPD 學分計算僅供參考，各執照更新機構（如香港中醫藥管理委員會）有其官方核准活動及申報程序，請以各機構規定為準。
      </p>
    </div>
  );
}
