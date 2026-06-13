import type { Locale } from "./types";
import { toTraditionalChinese } from "./to-traditional";

export function tcmEntityTitles(
  row: {
    pinyinName: string;
    chineseName: string;
    englishName?: string | null;
  },
  locale: Locale
): { primary: string; secondary: string } {
  const chineseTc = toTraditionalChinese(row.chineseName, locale);
  if (locale === "zh-Hant") {
    const secondary = [row.pinyinName, row.englishName].filter(Boolean).join(" · ");
    return {
      primary: chineseTc,
      secondary: secondary || row.pinyinName,
    };
  }
  const secondary = row.englishName
    ? `${row.chineseName} (${row.englishName})`
    : row.chineseName;
  return { primary: row.pinyinName, secondary };
}

export function localizePlainText(value: string | null | undefined, locale: Locale): string | undefined {
  if (value == null || value === "") return undefined;
  return toTraditionalChinese(value, locale);
}
