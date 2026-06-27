import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { ProfileForm } from "@/components/account/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const locale = await getLocale();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/account/profile");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, credentials: true, role: true },
  });
  if (!user) redirect("/login");

  const isZh = locale === "zh-Hant";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <nav className="mb-6 flex gap-4 text-sm border-b border-border pb-3">
        <Link href="/account/profile" className="font-semibold text-primary">
          {isZh ? "個人資料" : "Profile"}
        </Link>
        <Link href="/account/security" className="text-muted hover:text-foreground">
          {isZh ? "安全設定" : "Security"}
        </Link>
      </nav>

      <h1 className="text-3xl font-bold mb-1">{isZh ? "個人資料" : "Profile"}</h1>
      <p className="text-sm text-muted mb-6">
        {isZh
          ? `帳號：${user.email} · 角色：${user.role}`
          : `Account: ${user.email} · Role: ${user.role}`}
      </p>

      <ProfileForm
        name={user.name ?? ""}
        credentials={user.credentials}
        locale={locale}
      />
    </div>
  );
}
