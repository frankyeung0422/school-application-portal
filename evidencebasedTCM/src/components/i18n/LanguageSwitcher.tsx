"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/i18n/types";
import { LOCALE_COOKIE } from "@/lib/i18n/types";
import { useI18n } from "./I18nProvider";

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs"
      role="group"
      aria-label={t("language.switcherAria")}
    >
      <button
        type="button"
        onClick={() => switchTo("en")}
        disabled={pending}
        className={`rounded-md px-2 py-1 font-medium transition-colors ${
          locale === "en"
            ? "bg-primary text-white"
            : "text-muted hover:text-foreground"
        }`}
      >
        {t("language.english")}
      </button>
      <button
        type="button"
        onClick={() => switchTo("zh-Hant")}
        disabled={pending}
        className={`rounded-md px-2 py-1 font-medium transition-colors ${
          locale === "zh-Hant"
            ? "bg-primary text-white"
            : "text-muted hover:text-foreground"
        }`}
      >
        {t("language.traditionalChinese")}
      </button>
    </div>
  );
}
