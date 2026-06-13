"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/types";

interface Props {
  locale: Locale;
  referralId: string;
  role: "recipient" | "sender";
  status: string;
}

export function ReferralActions({ locale, referralId, role, status }: Props) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const [busy, setBusy] = useState(false);

  async function act(action: "accept" | "decline" | "revoke") {
    setBusy(true);
    const res = await fetch(`/api/referrals/${referralId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) {
      alert(j.error ?? T("操作失敗", "Failed"));
    } else {
      router.refresh();
    }
    setBusy(false);
  }

  if (role === "recipient" && status === "PENDING") {
    return (
      <span className="inline-flex gap-2">
        <button onClick={() => act("accept")} disabled={busy} className="text-xs rounded bg-primary text-white px-2 py-1 disabled:opacity-50">
          {T("接受", "Accept")}
        </button>
        <button onClick={() => act("decline")} disabled={busy} className="text-xs rounded border border-border bg-background px-2 py-1">
          {T("婉拒", "Decline")}
        </button>
      </span>
    );
  }
  if (role === "sender" && (status === "PENDING" || status === "ACCEPTED")) {
    return (
      <button onClick={() => act("revoke")} disabled={busy} className="text-xs rounded border border-red-300 text-red-700 bg-background px-2 py-1">
        {T("撤回", "Revoke")}
      </button>
    );
  }
  return null;
}
