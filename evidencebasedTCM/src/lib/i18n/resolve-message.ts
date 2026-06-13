export function getNestedString(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function t(messages: unknown, path: string, fallback?: string): string {
  return getNestedString(messages, path) ?? fallback ?? path;
}
