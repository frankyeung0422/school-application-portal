import { Converter } from "opencc-js/cn2t";
import type { Locale } from "./types";

const cnToTw = Converter({ from: "cn", to: "tw" });

/** Converts simplified / mainland Chinese to Taiwan Traditional; leaves English and punctuation unchanged. */
export function toTraditionalChinese(text: string, locale: Locale): string {
  if (locale !== "zh-Hant" || !text) return text;
  try {
    return cnToTw(text);
  } catch {
    return text;
  }
}

export function localizeDbText(
  value: string | null | undefined,
  locale: Locale
): string | undefined {
  if (value == null || value === "") return undefined;
  return toTraditionalChinese(value, locale);
}
