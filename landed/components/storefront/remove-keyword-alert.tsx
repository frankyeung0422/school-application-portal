"use client";

import { useRouter } from "next/navigation";

export function RemoveKeywordAlert({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-xs text-slate-500 underline hover:text-rose-600"
      onClick={async () => {
        await fetch("/api/keyword-alert", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        router.refresh();
      }}
    >
      取消
    </button>
  );
}
