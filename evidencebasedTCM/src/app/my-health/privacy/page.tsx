"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PrivacyPage() {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/health-profile")
      .then(r => r.json())
      .then(d => { setConsent(d.researchConsent ?? false); setLoading(false); });
  }, []);

  const handleSave = async (newConsent: boolean) => {
    setSaving(true); setSaved(false);
    await fetch("/api/health-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ researchConsent: newConsent }),
    });
    setConsent(newConsent);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/my-health" className="text-sm text-muted hover:text-foreground">← 我的健康</Link>
        <h1 className="text-xl font-bold text-foreground mt-1">個人資料及私隱</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-foreground mb-2">研究數據授權</h2>
          <p className="text-sm text-muted mb-4">
            啟用後，您的匿名健康數據（評估分數、病況類別、體質類型）將納入本平台認證研究人員可存取的彙總數據集。您的個人資料絕不會被分享——僅共享統計規律。
          </p>

          <ul className="text-sm text-muted space-y-2 mb-5">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>僅共享彙總的匿名數據</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>您的姓名及電郵絕不外洩</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>出生日期以年齡段代替（如「40多歲」）</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>您可隨時退出</li>
          </ul>

          {loading ? (
            <p className="text-sm text-muted">載入中……</p>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleSave(!consent)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${consent ? "bg-primary" : "bg-border"} disabled:opacity-50`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${consent ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-sm font-medium text-foreground">
                {consent ? "已加入研究貢獻（已啟用）" : "未參與研究貢獻"}
              </span>
            </div>
          )}
          {saved && <p className="text-sm text-green-600 mt-2">偏好已儲存。</p>}
        </div>

        <hr className="border-border" />

        <div>
          <h2 className="font-semibold text-foreground mb-2">我們收集的數據</h2>
          <ul className="text-sm text-muted space-y-1">
            <li>• 每週評估分數（整體、精力、睡眠、疼痛、壓力、消化）</li>
            <li>• 症狀記錄（症狀名稱及嚴重程度）</li>
            <li>• 活躍病況類別（病況名稱、中醫證型）</li>
            <li>• 體質評估結果（匿名處理）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
