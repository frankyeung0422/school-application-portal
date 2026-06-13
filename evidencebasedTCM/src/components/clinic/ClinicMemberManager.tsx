"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/types";

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: "OWNER" | "PRACTITIONER" | "RECEPTIONIST";
  joinedAt: string;
}

interface Props {
  locale: Locale;
  clinicId: string;
  isOwner: boolean;
  members: Member[];
}

export function ClinicMemberManager({ locale, clinicId, isOwner, members }: Props) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("PRACTITIONER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!email.trim()) {
      setError(T("請輸入電郵", "Email is required"));
      return;
    }
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/clinics/${clinicId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) {
      setError(j.error ?? T("加入失敗", "Failed"));
    } else {
      setEmail("");
      router.refresh();
    }
    setBusy(false);
  }

  async function remove(memberId: string) {
    if (!confirm(T("移除此成員？", "Remove this member?"))) return;
    const res = await fetch(`/api/clinics/${clinicId}/members?memberId=${memberId}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok || !j.ok) {
      alert(j.error ?? T("移除失敗", "Failed"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background text-xs text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">{T("姓名", "Name")}</th>
              <th className="text-left px-3 py-2 font-medium">{T("電郵", "Email")}</th>
              <th className="text-left px-3 py-2 font-medium">{T("角色", "Role")}</th>
              <th className="text-left px-3 py-2 font-medium">{T("加入時間", "Joined")}</th>
              {isOwner && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{m.name ?? "—"}</td>
                <td className="px-3 py-2 text-muted">{m.email}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    m.role === "OWNER" ? "bg-amber-100 text-amber-800" :
                    m.role === "PRACTITIONER" ? "bg-primary/10 text-primary" :
                    "bg-gray-100 text-gray-700"
                  }`}>{m.role}</span>
                </td>
                <td className="px-3 py-2 text-xs text-muted">{m.joinedAt.slice(0, 10)}</td>
                {isOwner && (
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => remove(m.id)} className="text-xs text-muted hover:text-red-500">✕</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-2">{T("邀請新成員", "Invite a member")}</h3>
          <p className="text-xs text-muted mb-3">
            {T("以對方的註冊電郵新增。對方須先註冊並具備醫師權限。", "Add by registered email. The user must be registered and have practitioner role or above.")}
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="flex-1 min-w-[12rem] rounded border border-border bg-background px-2 py-1 text-sm"
              placeholder={T("email@example.com", "email@example.com")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="rounded border border-border bg-background px-2 py-1 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as Member["role"])}
            >
              <option value="PRACTITIONER">{T("醫師", "Practitioner")}</option>
              <option value="RECEPTIONIST">{T("接待員", "Receptionist")}</option>
              <option value="OWNER">{T("負責人", "Owner")}</option>
            </select>
            <button
              onClick={add}
              disabled={busy}
              className="rounded bg-primary text-white px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {T("加入", "Add")}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-700 mt-2">❌ {error}</p>
          )}
        </div>
      )}
    </div>
  );
}
