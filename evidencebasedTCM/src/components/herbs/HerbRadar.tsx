"use client";

import { RadarChart } from "@/components/charts/RadarChart";

interface Props {
  nature: string;
  flavors: string[];
  meridians: string[];
  title: string;
}

// Map TCM qualities into a 6-axis radar for quick visual profiling.
// This is a heuristic visual aid, not a formal scoring system.
const NATURE_WARMTH: Record<string, number> = {
  HOT: 3,
  WARM: 2,
  NEUTRAL: 0,
  COOL: -2,
  COLD: -3,
};

export function HerbRadar({ nature, flavors, meridians, title }: Props) {
  const warmth = NATURE_WARMTH[nature?.toUpperCase?.() ?? nature] ?? 0;
  // Flavor values are stored Title-cased ("Pungent", "Sweet", …); normalize so
  // the axes don't silently read 0.
  const flav = flavors.map((f) => f.toLowerCase());
  const axes = [
    { label: "溫性", value: Math.max(0, warmth), max: 3 },
    { label: "涼性", value: Math.max(0, -warmth), max: 3 },
    { label: "辛散", value: flav.includes("pungent") ? 3 : 0, max: 3 },
    { label: "補益", value: flav.includes("sweet") ? 3 : 0, max: 3 },
    { label: "清瀉", value: flav.includes("bitter") ? 3 : 0, max: 3 },
    { label: "經絡廣度", value: Math.min(meridians.length, 4), max: 4 },
  ];
  return (
    <div className="rounded-lg border border-border p-4 bg-surface">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <RadarChart axes={axes} />
    </div>
  );
}
