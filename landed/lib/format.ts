export function hkd(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const v = cents / 100;
  return `HK$${v.toLocaleString("en-HK", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function hkdSigned(cents: number): string {
  return `${cents < 0 ? "−" : "+"}${hkd(Math.abs(cents))}`;
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function native(amount: number, currency: string): string {
  const sym: Record<string, string> = { USD: "US$", CNY: "¥", HKD: "HK$", JPY: "¥", EUR: "€", GBP: "£" };
  return `${sym[currency] ?? currency + " "}${amount.toLocaleString("en-HK", { maximumFractionDigits: 2 })}`;
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "未有";
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "啱啱";
  if (min < 60) return `${min} 分鐘前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小時前`;
  return `${Math.floor(h / 24)} 日前`;
}

/** A Date `ms` before now — keeps Date.now() out of component bodies. */
export function msAgo(ms: number): Date {
  return new Date(Date.now() - ms);
}

export function remaining(deadline: Date, now = Date.now()): { days: number; hours: number; past: boolean } {
  const ms = deadline.getTime() - now;
  return {
    days: Math.max(0, Math.floor(ms / 86400_000)),
    hours: Math.max(0, Math.floor((ms % 86400_000) / 3600_000)),
    past: ms <= 0,
  };
}

export function hoursSince(d: Date | null | undefined, now = Date.now()): number | null {
  return d ? (now - new Date(d).getTime()) / 3600_000 : null;
}

/** ASCII-only slugs: CJK path segments round-trip unreliably through proxies, curl and share links. */
export function slugify(title: string, id?: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  // A Chinese-only title leaves stray digits ("9-nfc-50"); say "item" instead.
  const usable = base.replace(/[^a-z]/g, "").length >= 3 ? base : "item";
  return id != null ? `${usable}-${id}` : usable;
}

export function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
