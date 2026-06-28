import { auth } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

export const metadata = { title: "我的健康總覽 — EBTCM" };

export default async function MyHealthPage() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!user?.id) redirect("/login?callbackUrl=/my-health");

  const profile = await prisma.userHealthProfile.findUnique({ where: { userId: user.id } });

  const [conditionCount, checkInCount, symptomCount, lastCheckIn] = await Promise.all([
    profile ? prisma.userConditionLog.count({ where: { profileId: profile.id, status: "ACTIVE" } }) : 0,
    profile ? prisma.healthCheckIn.count({ where: { profileId: profile.id } }) : 0,
    profile ? prisma.symptomLog.count({ where: { profileId: profile.id } }) : 0,
    profile ? prisma.healthCheckIn.findFirst({ where: { profileId: profile.id }, orderBy: { checkInDate: "desc" } }) : null,
  ]);

  const cards = [
    {
      href: "/my-health/conditions",
      icon: "🩺",
      title: "我的病況",
      subtitle: `${conditionCount} 個活躍病況`,
      cta: conditionCount === 0 ? "新增第一個病況" : "查看及管理",
      color: "border-blue-200 bg-blue-50",
    },
    {
      href: "/my-health/symptoms",
      icon: "📝",
      title: "症狀日記",
      subtitle: `${symptomCount} 則記錄`,
      cta: "記錄症狀",
      color: "border-amber-200 bg-amber-50",
    },
    {
      href: "/my-health/check-in",
      icon: "📊",
      title: "每週健康評估",
      subtitle: lastCheckIn
        ? `上次：${lastCheckIn.checkInDate.toLocaleDateString("zh-HK")} · 評分 ${lastCheckIn.overallScore}/10`
        : "尚未評估",
      cta: "開始評估",
      color: "border-green-200 bg-green-50",
    },
    {
      href: "/my-health/timeline",
      icon: "📅",
      title: "健康時間軸",
      subtitle: `${checkInCount} 則評估記錄`,
      cta: "查看時間軸",
      color: "border-purple-200 bg-purple-50",
    },
    {
      href: "/diagnose/constitution",
      icon: "🧬",
      title: "體質評估",
      subtitle: "王琦九型中醫體質",
      cta: "開始評估",
      color: "border-rose-200 bg-rose-50",
    },
    {
      href: "/account/security",
      icon: "⚙️",
      title: "個人資料及私隱",
      subtitle: profile?.researchConsent ? "正在參與研究貢獻" : "未參與研究貢獻",
      cta: "管理設定",
      color: "border-slate-200 bg-slate-50",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">我的健康總覽</h1>
        <p className="text-muted mt-1">
          歡迎回來，{user.name?.split(" ")[0] ?? "朋友"}。以循證中醫追蹤您的健康旅程。
        </p>
      </div>

      {!profile?.researchConsent && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <span className="text-green-600 text-xl">🔬</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">協助推進中醫研究</p>
            <p className="text-xs text-green-700 mt-0.5">
              選擇加入，將您的匿名健康數據與研究人員共享——您的記錄有助驗證中醫證型及方劑。
            </p>
          </div>
          <Link
            href="/my-health/privacy"
            className="shrink-0 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
          >
            了解更多
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${card.color}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <h2 className="font-semibold text-foreground">{card.title}</h2>
            <p className="text-sm text-muted mt-1">{card.subtitle}</p>
            <p className="text-xs font-medium text-primary mt-3">{card.cta} →</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground mb-3">探索中醫知識</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/conditions", label: "瀏覽病症" },
            { href: "/patterns", label: "中醫證型" },
            { href: "/food-therapy", label: "食療" },
            { href: "/herbs", label: "草藥資料庫" },
            { href: "/interactions", label: "安全查核" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted hover:text-foreground hover:border-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
