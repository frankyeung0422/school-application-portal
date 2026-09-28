"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface OpField {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "checkbox" | "textarea";
  defaultValue?: string | number | boolean | null;
  options?: string[];
  step?: string;
  placeholder?: string;
  width?: string;
}

/**
 * Generic admin mutation: posts {op, ...hidden, ...fields} to /api/admin/op,
 * shows the result or error inline, and refreshes the server component.
 */
export function OpForm({
  op,
  hidden = {},
  fields = [],
  label,
  tone = "primary",
  confirm,
  inline = true,
}: {
  op: string;
  hidden?: Record<string, string | number>;
  fields?: OpField[];
  label: string;
  tone?: "primary" | "secondary" | "danger";
  confirm?: string;
  inline?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = { op, ...Object.fromEntries(Object.entries(hidden).map(([k, v]) => [k, String(v)])) };
    for (const f of fields) {
      body[f.name] = f.type === "checkbox" ? String(fd.get(f.name) === "on") : String(fd.get(f.name) ?? "");
    }
    const res = await fetch("/api/admin/op", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: String(data.error ?? `HTTP ${res.status}`) });
      return;
    }
    const status = typeof data.status === "string" ? data.status : null;
    const reason = typeof data.reason === "string" ? data.reason : null;
    setMsg({ ok: status !== "failed" && status !== "blocked", text: status ? `${status}${reason ? ` — ${reason}` : ""}` : "✓" });
    router.refresh();
  }

  const btn = tone === "danger" ? "btn-danger" : tone === "secondary" ? "btn-secondary" : "btn-primary";
  return (
    <form onSubmit={submit} className={inline ? "flex flex-wrap items-end gap-2" : "space-y-2"}>
      {fields.map((f) => (
        <div key={f.name} className={f.type === "checkbox" ? "flex items-center gap-1" : f.width ?? "w-32"}>
          {f.type === "checkbox" ? (
            <>
              <input id={`${op}-${f.name}`} name={f.name} type="checkbox" defaultChecked={Boolean(f.defaultValue)} />
              <label htmlFor={`${op}-${f.name}`} className="text-xs">{f.label}</label>
            </>
          ) : (
            <>
              <label className="label">{f.label}</label>
              {f.type === "select" ? (
                <select name={f.name} defaultValue={String(f.defaultValue ?? "")} className="input">
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea name={f.name} defaultValue={String(f.defaultValue ?? "")} className="input" rows={2} placeholder={f.placeholder} />
              ) : (
                <input
                  name={f.name}
                  type={f.type ?? "text"}
                  step={f.step ?? (f.type === "number" ? "any" : undefined)}
                  defaultValue={f.defaultValue == null ? "" : String(f.defaultValue)}
                  placeholder={f.placeholder}
                  className="input"
                />
              )}
            </>
          )}
        </div>
      ))}
      <button className={`${btn} py-1.5`} disabled={busy}>{busy ? "…" : label}</button>
      {msg ? <span className={`text-xs ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</span> : null}
    </form>
  );
}
