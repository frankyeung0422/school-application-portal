import Link from "next/link";
import { AuthForm } from "@/components/storefront/auth-form";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-center text-2xl font-bold">註冊 Create account</h1>
      <AuthForm mode="register" next={next} />
      <p className="text-center text-sm text-slate-500">
        已有帳戶？{" "}
        <Link className="text-brand-700 underline" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          登入 Sign in
        </Link>
      </p>
    </div>
  );
}
