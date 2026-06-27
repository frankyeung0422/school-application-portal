"use client";

import { useState } from "react";

interface Props {
  name: string;
  credentials: string | null;
  locale: "zh-Hant" | "en";
}

export function ProfileForm({ name: initialName, credentials: initialCreds, locale }: Props) {
  const isZh = locale === "zh-Hant";
  const [name, setName] = useState(initialName ?? "");
  const [credentials, setCredentials] = useState(initialCreds ?? "");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const saveProfile = async () => {
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, credentials }),
      });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        setProfileMsg({ type: "ok", text: isZh ? "已儲存。" : "Saved." });
      } else {
        setProfileMsg({ type: "err", text: data.error ?? (isZh ? "儲存失敗。" : "Save failed.") });
      }
    } catch {
      setProfileMsg({ type: "err", text: isZh ? "網絡錯誤。" : "Network error." });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: isZh ? "兩次輸入的密碼不一致。" : "Passwords do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "err", text: isZh ? "新密碼至少需 8 個字元。" : "New password must be at least 8 characters." });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        setPwMsg({ type: "ok", text: isZh ? "密碼已更新。" : "Password updated." });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        setPwMsg({ type: "err", text: data.error ?? (isZh ? "更新失敗。" : "Update failed.") });
      }
    } catch {
      setPwMsg({ type: "err", text: isZh ? "網絡錯誤。" : "Network error." });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile info */}
      <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold">{isZh ? "個人資料" : "Profile Information"}</h2>
        <label className="block">
          <span className="text-sm text-muted">{isZh ? "全名" : "Full Name"}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">
            {isZh ? "專業資格／簡介（選填）" : "Credentials / Bio (optional)"}
          </span>
          <textarea
            value={credentials}
            onChange={(e) => setCredentials(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        {profileMsg && (
          <p className={`text-sm ${profileMsg.type === "ok" ? "text-green-700" : "text-red-700"}`}>
            {profileMsg.text}
          </p>
        )}
        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? (isZh ? "儲存中…" : "Saving…") : (isZh ? "儲存" : "Save")}
        </button>
      </section>

      {/* Password change */}
      <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold">{isZh ? "更改密碼" : "Change Password"}</h2>
        <label className="block">
          <span className="text-sm text-muted">{isZh ? "目前密碼" : "Current Password"}</span>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">{isZh ? "新密碼" : "New Password"}</span>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            placeholder={isZh ? "至少 8 個字元" : "Min. 8 characters"}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">{isZh ? "確認新密碼" : "Confirm New Password"}</span>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        {pwMsg && (
          <p className={`text-sm ${pwMsg.type === "ok" ? "text-green-700" : "text-red-700"}`}>
            {pwMsg.text}
          </p>
        )}
        <button
          type="button"
          onClick={changePassword}
          disabled={pwSaving || !currentPw || !newPw || !confirmPw}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {pwSaving ? (isZh ? "更新中…" : "Updating…") : (isZh ? "更改密碼" : "Change Password")}
        </button>
      </section>
    </div>
  );
}
