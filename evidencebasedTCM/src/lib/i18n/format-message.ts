import { t } from "./resolve-message";

export function tf(
  messages: unknown,
  path: string,
  vars: Record<string, string | number>,
  fallback?: string
): string {
  let s = t(messages, path, fallback);
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}
