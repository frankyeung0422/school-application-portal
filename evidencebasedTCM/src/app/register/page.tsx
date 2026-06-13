import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";

export default async function RegisterPage() {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white font-bold text-xl">
            EB
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">{t(messages, "auth.registerTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t(messages, "auth.registerSubtitle")}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <Suspense
            fallback={
              <div className="h-64 flex items-center justify-center text-muted text-sm">
                {t(messages, "common.loading")}
              </div>
            }
          >
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
