import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { getLocale } from "@/lib/i18n/locale-server";
import { FBSchedulerClient } from "@/components/admin/FBSchedulerClient";

export const dynamic = "force-dynamic";

export default async function FBSchedulerPage() {
  const locale = await getLocale();
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") {
    redirect("/login?next=/admin/fb-scheduler");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">
        📘 {locale === "zh-Hant" ? "Facebook 排程後台" : "Facebook Scheduler"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {locale === "zh-Hant"
          ? "24 篇 markdown 貼文 + 海報 → Facebook 自動發布。設定 FB_PAGE_ACCESS_TOKEN 後即可使用。"
          : "24 markdown posts + posters → automated Facebook publishing. Configure FB_PAGE_ACCESS_TOKEN to enable."}
      </p>
      <FBSchedulerClient locale={locale} />
    </div>
  );
}
