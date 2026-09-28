import Link from "next/link";
import { AuthForm } from "@/components/storefront/auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-center text-2xl font-bold">登入 Sign in</h1>
      <AuthForm mode="login" next={next} />
      <p className="text-center text-sm text-slate-500">
        未有帳戶？{" "}
        <Link className="text-brand-700 underline" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          註冊 Create one
        </Link>
      </p>
    </div>
  );
}
