"use client";

import { useState } from "react";

interface Props {
  courseId: string;
  lessonNum: number;
  initialDone: boolean;
  locale?: "zh-Hant" | "en";
}

export function LessonProgressButton({ courseId, lessonNum, initialDone, locale = "zh-Hant" }: Props) {
  const [done, setDone] = useState(initialDone);
  const [loading, setLoading] = useState(false);

  const isZh = locale === "zh-Hant";

  async function toggle() {
    setLoading(true);
    const optimistic = !done;
    setDone(optimistic);
    try {
      const res = await fetch("/api/learn/progress", {
        method: optimistic ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonNum }),
      });
      if (!res.ok) setDone(!optimistic);
    } catch {
      setDone(!optimistic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        done
          ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
          : "border-border bg-surface text-muted hover:text-foreground hover:border-primary-light"
      }`}
    >
      <span className="text-base leading-none">{done ? "✓" : "○"}</span>
      {done
        ? (isZh ? "已完成" : "Completed")
        : (isZh ? "標記完成" : "Mark complete")}
    </button>
  );
}
