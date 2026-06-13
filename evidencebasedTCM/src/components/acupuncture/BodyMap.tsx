"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACUPOINT_COORDS, meridianColor, type BodyView } from "@/lib/acupoints/coordinates";

export interface BodyMapPoint {
  id: string;
  code: string;
  pinyinName: string;
  chineseName: string;
  meridian: string;
}

interface Props {
  points: BodyMapPoint[];
  locale: "zh-Hant" | "en";
  highlightCode?: string;
  initialView?: BodyView;
  compact?: boolean;
  labels: {
    front: string;
    back: string;
    allMeridians: string;
    clickHint: string;
    noMapping: string;
  };
}

export function BodyMap({
  points,
  locale,
  highlightCode,
  initialView = "front",
  compact = false,
  labels,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<BodyView>(initialView);
  const [meridianFilter, setMeridianFilter] = useState<string>("");
  const [hovered, setHovered] = useState<string | null>(null);

  const meridians = useMemo(() => {
    const set = new Set<string>();
    for (const p of points) if (ACUPOINT_COORDS[p.code]) set.add(p.meridian);
    return Array.from(set).sort();
  }, [points]);

  const visiblePoints = useMemo(() => {
    return points
      .map((p) => ({ ...p, coord: ACUPOINT_COORDS[p.code] }))
      .filter((p) => p.coord && p.coord.view === view)
      .filter((p) => !meridianFilter || p.meridian === meridianFilter);
  }, [points, view, meridianFilter]);

  // Meridian path (connect points of a single meridian in order of code numeric)
  const meridianPath = useMemo(() => {
    if (!meridianFilter) return null;
    const sorted = [...visiblePoints].sort((a, b) => {
      const na = parseInt(a.code.replace(/\D/g, ""), 10) || 0;
      const nb = parseInt(b.code.replace(/\D/g, ""), 10) || 0;
      return na - nb;
    });
    if (sorted.length < 2) return null;
    return sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${p.coord.x} ${p.coord.y}`).join(" ");
  }, [visiblePoints, meridianFilter]);

  const highlightCoord = highlightCode ? ACUPOINT_COORDS[highlightCode] : null;
  // Auto-switch to the view where the highlighted point lives
  const effectiveView = highlightCoord && !hovered ? highlightCoord.view : view;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setView("front")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "front" ? "bg-primary text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {labels.front}
          </button>
          <button
            type="button"
            onClick={() => setView("back")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "back" ? "bg-primary text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {labels.back}
          </button>
        </div>

        {!compact && (
          <select
            value={meridianFilter}
            onChange={(e) => setMeridianFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
          >
            <option value="">{labels.allMeridians}</option>
            {meridians.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}

        {!compact && <span className="text-xs text-muted ml-auto">{labels.clickHint}</span>}
      </div>

      <div className="relative mx-auto" style={{ maxWidth: compact ? 260 : 360 }}>
        <svg
          viewBox="0 0 300 720"
          className="w-full h-auto select-none"
          role="img"
          aria-label="Human body acupoint map"
        >
          <HumanSilhouette view={effectiveView} />

          {/* Meridian pathway */}
          {meridianPath && (
            <path
              d={meridianPath}
              fill="none"
              stroke={meridianColor(meridianFilter)}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.7}
            />
          )}

          {/* Points */}
          {visiblePoints.map((p) => {
            const isHighlight = highlightCode === p.code;
            const isHover = hovered === p.code;
            const color = meridianColor(p.meridian);
            return (
              <g
                key={p.id}
                transform={`translate(${p.coord.x} ${p.coord.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(p.code)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => router.push(`/acupuncture/${p.id}`)}
              >
                {isHighlight && (
                  <>
                    <circle r={14} fill={color} opacity={0.2}>
                      <animate
                        attributeName="r"
                        values="8;16;8"
                        dur="1.6s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.35;0.05;0.35"
                        dur="1.6s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle r={8} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
                  </>
                )}
                <circle
                  r={isHover || isHighlight ? 5 : 3.5}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={1}
                />
                {(isHover || isHighlight) && (
                  <text
                    x={8}
                    y={-6}
                    fontSize={10}
                    fill="#111"
                    className="pointer-events-none"
                    style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 } as React.CSSProperties}
                  >
                    {p.code}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hovered && (() => {
          const hp = visiblePoints.find((p) => p.code === hovered);
          if (!hp) return null;
          const name = locale === "zh-Hant" ? hp.chineseName : hp.pinyinName;
          return (
            <div className="absolute left-2 top-2 rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow">
              <span className="font-mono font-semibold mr-1">{hp.code}</span>
              <span>{name}</span>
              <span className="ml-1 text-white/70">· {hp.meridian}</span>
            </div>
          );
        })()}
      </div>

      {highlightCode && !ACUPOINT_COORDS[highlightCode] && (
        <p className="mt-3 text-center text-xs text-muted">{labels.noMapping}</p>
      )}

      {!compact && (
        <div className="mt-3 text-center">
          <Link
            href="/acupuncture"
            className="text-xs text-primary hover:underline"
          >
            ← {labels.allMeridians}
          </Link>
        </div>
      )}
    </div>
  );
}

// Simplified anterior/posterior human silhouette used as a reference body.
// Kept purely decorative — points are positioned via ACUPOINT_COORDS.
function HumanSilhouette({ view }: { view: BodyView }) {
  // Both views share the same silhouette; we tint the back view subtly and
  // draw a spine guideline to help pinpoint back points.
  const fill = view === "back" ? "#eef2f7" : "#f8fafc";
  const stroke = "#cbd5e1";
  return (
    <g>
      {/* Head */}
      <ellipse cx={150} cy={58} rx={32} ry={40} fill={fill} stroke={stroke} strokeWidth={1} />
      {/* Neck */}
      <rect x={137} y={92} width={26} height={22} fill={fill} stroke={stroke} strokeWidth={1} />
      {/* Torso */}
      <path
        d="M 110 120 Q 95 130 90 165 L 90 260 Q 95 320 110 360 L 190 360 Q 205 320 210 260 L 210 165 Q 205 130 190 120 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      {/* Arms */}
      <path
        d="M 92 140 Q 75 190 75 260 Q 72 320 70 370 L 88 370 Q 92 320 95 260 Q 100 200 110 150 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      <path
        d="M 208 140 Q 225 190 225 260 Q 228 320 230 370 L 212 370 Q 208 320 205 260 Q 200 200 190 150 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      {/* Hands */}
      <ellipse cx={78} cy={390} rx={15} ry={20} fill={fill} stroke={stroke} strokeWidth={1} />
      <ellipse cx={222} cy={390} rx={15} ry={20} fill={fill} stroke={stroke} strokeWidth={1} />
      {/* Hips */}
      <path
        d="M 108 360 L 190 360 Q 200 380 198 410 L 155 420 L 102 410 Q 100 380 108 360 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      {/* Legs */}
      <path
        d="M 110 415 L 148 415 L 145 560 Q 142 620 135 680 L 115 680 Q 118 620 115 560 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      <path
        d="M 152 415 L 190 415 L 185 560 Q 182 620 175 680 L 155 680 Q 158 620 155 560 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      {/* Feet */}
      <ellipse cx={125} cy={688} rx={18} ry={8} fill={fill} stroke={stroke} strokeWidth={1} />
      <ellipse cx={170} cy={688} rx={18} ry={8} fill={fill} stroke={stroke} strokeWidth={1} />

      {/* Back-view landmarks: spine and shoulder blades */}
      {view === "back" && (
        <>
          <line x1={150} y1={120} x2={150} y2={360} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
          <path d="M 120 160 Q 130 180 135 210" fill="none" stroke="#cbd5e1" strokeWidth={1} />
          <path d="M 180 160 Q 170 180 165 210" fill="none" stroke="#cbd5e1" strokeWidth={1} />
        </>
      )}

      {/* Front-view landmarks: navel + midline */}
      {view === "front" && (
        <>
          <line x1={150} y1={120} x2={150} y2={360} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="2 4" />
          <circle cx={150} cy={306} r={2} fill="#94a3b8" />
        </>
      )}
    </g>
  );
}
