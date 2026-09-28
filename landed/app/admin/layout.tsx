import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFlag } from "@/lib/settings";
import { loadScheduleHealth } from "@/lib/jobs/health-service";
import { isUnhealthy } from "@/lib/health";

export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "總覽 Dashboard"],
  ["/admin/actions", "待批 Approvals"],
  ["/admin/analytics", "數據 Analytics"],
  ["/admin/affiliate", "佣金 Affiliate"],
  ["/admin/eligibility", "資格 Eligibility"],
  ["/admin/products", "產品 Products"],
  ["/admin/purchasing", "採購 Purchasing"],
  ["/admin/pools", "拼單 Pools"],
  ["/admin/counterfeits", "疑似冒牌 Fakes"],
  ["/admin/price-reports", "門市報價 Reports"],
  ["/admin/channels", "渠道 Channels"],
  ["/admin/suppliers", "供應商 Suppliers"],
  ["/admin/readiness", "就緒 Readiness"],
  ["/admin/jobs", "工作 Jobs"],
  ["/admin/settings", "設定 Settings"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await currentCustomer();
  if (!me) redirect("/login?next=/admin");
  if (!me.isAdmin) redirect("/");
  const [pending, runMode, killSwitch, health] = await Promise.all([
    prisma.actionRequest.count({ where: { status: "pending" } }),
    getFlag("runMode", "DRY"),
    getFlag("killSwitch", "OFF"),
    loadScheduleHealth(),
  ]);
  const unhealthy = health.types.filter(isUnhealthy);
  return (
    <div className="space-y-4">
      {killSwitch === "ON" ? (
        <div className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
          ⛔ 緊急停止已啟動 Kill switch ON — every non-protective action is blocked. <Link href="/admin/settings" className="underline">Settings</Link>
        </div>
      ) : null}
      {unhealthy.length ? (
        <div className="rounded-xl bg-rose-100 px-4 py-2 text-sm text-rose-900">
          <span className="font-semibold">⚠ 背景工作停滯 Worker behind schedule — visitors are seeing stale data:</span>{" "}
          {unhealthy.map((h) => `${h.type} ${h.status} (${h.detail})`).join(" · ")}{" "}
          <Link href="/admin/jobs" className="underline">Jobs</Link>
        </div>
      ) : null}
      {runMode === "DRY" ? (
        <div className="rounded-xl bg-sky-100 px-4 py-2 text-sm text-sky-900">
          模擬模式 DRY run — approved listings, posts and emails are simulated; nothing leaves this machine.
        </div>
      ) : null}
      <nav className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 text-sm">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-xl px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            {label}
            {href === "/admin/actions" && pending ? (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">{pending}</span>
            ) : null}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
