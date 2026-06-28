"use client";

import { useEffect, useRef } from "react";

interface Props {
  activityType: string;
  referenceId: string;
  title: string;
  credits: number;
}

/**
 * Invisible component that fires a CPD credit log on first mount.
 * Drop it anywhere on a page where a CPD-eligible activity is occurring.
 * Silently no-ops if the API returns 401/403 (non-practitioner users).
 */
export function CpdTracker({ activityType, referenceId, title, credits }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch("/api/learn/cpd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityType, referenceId, title, credits }),
    }).catch(() => {});
  }, [activityType, referenceId, title, credits]);

  return null;
}
