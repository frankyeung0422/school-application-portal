"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

interface DeleteButtonProps {
  entityType: string;
  entityId: string;
  entityName: string;
}

export function DeleteButton({ entityType, entityId, entityName }: DeleteButtonProps) {
  const router = useRouter();
  const { t, tf } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${entityType}/${entityId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-600 hover:underline disabled:opacity-50"
        >
          {loading ? "…" : t("admin.confirm")}
        </button>
        <button onClick={() => setConfirming(false)} className="text-xs text-muted hover:underline">
          {t("admin.cancel")}
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:underline"
      title={tf("admin.deleteEntityTitle", { name: entityName })}
    >
      {t("admin.delete")}
    </button>
  );
}
