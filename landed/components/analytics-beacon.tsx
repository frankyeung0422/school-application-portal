"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** One "view" per client-side page change; the first carries the external referrer. */
export function AnalyticsBeacon() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (!path) return;
    const body = JSON.stringify({ path, event: path === "/search" ? "search" : "view", ref: first.current ? document.referrer : null });
    first.current = false;
    track(body);
  }, [path]);
  return null;
}

/** Fire-and-forget; never blocks navigation or throws. */
export function trackEvent(event: "watch" | "basket" | "search") {
  track(JSON.stringify({ path: window.location.pathname, event }));
}

function track(body: string) {
  try {
    if (navigator.sendBeacon?.("/api/e", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/e", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    // analytics must never break the page
  }
}
