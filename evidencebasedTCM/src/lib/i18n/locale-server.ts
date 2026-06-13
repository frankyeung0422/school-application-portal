import { cookies } from "next/headers";
import { cache } from "react";
import type { Locale } from "./types";
import { LOCALE_COOKIE } from "./types";

export const getLocale = cache(async (): Promise<Locale> => {
  const jar = await cookies();
  const v = jar.get(LOCALE_COOKIE)?.value;
  if (v === "en") return "en";
  return "zh-Hant";
});
