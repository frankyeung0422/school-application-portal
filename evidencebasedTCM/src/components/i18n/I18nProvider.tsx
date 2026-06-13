"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Locale } from "@/lib/i18n/types";
import { getNestedString } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";

type I18nContextValue = {
  locale: Locale;
  t: (path: string, fallback?: string) => string;
  tf: (path: string, vars: Record<string, string | number>, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Record<string, unknown>;
  children: ReactNode;
}) {
  const translate = useCallback(
    (path: string, fallback?: string) =>
      getNestedString(messages, path) ?? fallback ?? path,
    [messages]
  );

  const translateFormat = useCallback(
    (path: string, vars: Record<string, string | number>, fallback?: string) =>
      tf(messages, path, vars, fallback),
    [messages]
  );

  const value = useMemo(
    () => ({
      locale,
      t: translate,
      tf: translateFormat,
    }),
    [locale, translate, translateFormat]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
