"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/components/i18n/I18nProvider";

interface BookmarkButtonProps {
  entityType: "HERB" | "FORMULA" | "ACUPOINT" | "PATTERN" | "EVIDENCE" | "CONDITION";
  entityId: string;
  className?: string;
}

export function BookmarkButton({ entityType, entityId, className = "" }: BookmarkButtonProps) {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch(`/api/bookmarks?entityType=${entityType}&entityId=${entityId}`)
      .then((res) => res.json())
      .then((data) => {
        setIsBookmarked(data.bookmarks?.length > 0);
      })
      .catch(() => {});
  }, [session, entityType, entityId]);

  if (!session?.user) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      if (isBookmarked) {
        await fetch(`/api/bookmarks?entityType=${entityType}&entityId=${entityId}`, {
          method: "DELETE",
        });
        setIsBookmarked(false);
      } else {
        await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityType, entityId }),
        });
        setIsBookmarked(true);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        isBookmarked
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-muted hover:text-foreground hover:bg-background"
      } disabled:opacity-50 ${className}`}
      title={isBookmarked ? t("bookmark.removeTitle") : t("bookmark.addTitle")}
    >
      <svg
        className="h-4 w-4"
        fill={isBookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      {isBookmarked ? t("bookmark.saved") : t("bookmark.save")}
    </button>
  );
}
