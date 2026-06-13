import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { TotpSetup } from "@/components/account/TotpSetup";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const locale = await getLocale();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/account/security");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, totpEnabled: true },
  });
  if (!user) redirect("/login");

  const isZh = locale === "zh-Hant";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">
        {isZh ? "帳戶安全" : "Account Security"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {isZh
          ? "啟用兩步驗證 (2FA) 可顯著降低帳戶被盜用的風險，特別是處理病人資料時。"
          : "Enable two-factor authentication (2FA) to materially reduce account-takeover risk, especially when handling patient data."}
      </p>

      <TotpSetup locale={locale} initiallyEnabled={user.totpEnabled} email={user.email} />
    </div>
  );
}
