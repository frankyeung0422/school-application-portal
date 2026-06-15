"use client";

import { useState } from "react";
import { ACUPOINT_COORDS, meridianColor, type AcupointCoord } from "@/lib/acupoints/coordinates";
import { BodyMap, type BodyMapPoint } from "./BodyMap";

interface Props {
  point: BodyMapPoint;
  allPoints: BodyMapPoint[];
  locale: "zh-Hant" | "en";
  labels: {
    front: string;
    back: string;
    allMeridians: string;
    clickHint: string;
    noMapping: string;
    overview: string;
    zoomedView: string;
    needleDiagram: string;
    cunRuler: string;
    angle: string;
    depth: string;
    perpendicular: string;
    oblique: string;
    transverse: string;
    landmark: string;
    skinLayer: string;
    subcutaneous: string;
    muscle: string;
    cunHint: string;
    cunLandmarkTitle: string;
    cunLandmarks: [string, string][]; // [label, value]
  };
}

export function AcupointLocator({ point, allPoints, locale, labels }: Props) {
  const coord = ACUPOINT_COORDS[point.code];
  const [mode, setMode] = useState<"body" | "zoom" | "needle" | "cun">(
    coord ? "body" : "cun"
  );

  const color = meridianColor(point.meridian);

  const modes = [
    { id: "body" as const, label: labels.overview, enabled: !!coord },
    { id: "zoom" as const, label: labels.zoomedView, enabled: !!coord?.zoom },
    { id: "needle" as const, label: labels.needleDiagram, enabled: coord?.needleAngle !== undefined },
    { id: "cun" as const, label: labels.cunRuler, enabled: true },
  ];

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={!m.enabled}
            onClick={() => setMode(m.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === m.id
                ? "bg-primary text-white"
                : m.enabled
                  ? "text-muted hover:text-foreground"
                  : "text-muted/40 cursor-not-allowed"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "body" && coord && (
        <BodyMap
          points={allPoints}
          locale={locale}
          highlightCode={point.code}
          initialView={coord.view}
          compact
          labels={{
            front: labels.front,
            back: labels.back,
            allMeridians: labels.allMeridians,
            clickHint: labels.clickHint,
            noMapping: labels.noMapping,
          }}
        />
      )}

      {mode === "zoom" && coord?.zoom && (
        <ZoomedView coord={coord} code={point.code} color={color} label={labels.landmark} />
      )}

      {mode === "needle" && coord?.needleAngle !== undefined && (
        <NeedleDiagram
          angle={coord.needleAngle}
          depth={coord.needleDepth ?? 0.5}
          labels={{
            angle: labels.angle,
            depth: labels.depth,
            perpendicular: labels.perpendicular,
            oblique: labels.oblique,
            transverse: labels.transverse,
            skin: labels.skinLayer,
            subcutaneous: labels.subcutaneous,
            muscle: labels.muscle,
          }}
          color={color}
        />
      )}

      {mode === "cun" && (
        <CunRuler
          hint={labels.cunHint}
          title={labels.cunLandmarkTitle}
          landmarks={labels.cunLandmarks}
        />
      )}
    </div>
  );
}

// Zoomed region — SVG <use> of silhouette clipped to coord.zoom window, with crosshair.
function ZoomedView({
  coord,
  code,
  color,
  label,
}: {
  coord: AcupointCoord;
  code: string;
  color: string;
  label: string;
}) {
  const [zx, zy, zw, zh] = coord.zoom!;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <svg viewBox={`${zx} ${zy} ${zw} ${zh}`} className="w-full max-w-sm mx-auto">
        {/* Light silhouette background, drawn at full body scale, will be clipped by viewBox */}
        <MiniSilhouette view={coord.view} />

        {/* Crosshair guides */}
        <line
          x1={zx}
          y1={coord.y}
          x2={zx + zw}
          y2={coord.y}
          stroke={color}
          strokeWidth={0.4}
          strokeDasharray="2 2"
          opacity={0.6}
        />
        <line
          x1={coord.x}
          y1={zy}
          x2={coord.x}
          y2={zy + zh}
          stroke={color}
          strokeWidth={0.4}
          strokeDasharray="2 2"
          opacity={0.6}
        />

        {/* Pulsing highlight */}
        <circle cx={coord.x} cy={coord.y} r={4} fill={color} opacity={0.25}>
          <animate attributeName="r" values="3;7;3" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <circle cx={coord.x} cy={coord.y} r={2} fill={color} stroke="#fff" strokeWidth={0.6} />

        {/* Code label */}
        <text
          x={coord.x + 5}
          y={coord.y - 4}
          fontSize={5}
          fill="#111"
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 1.2 } as React.CSSProperties}
        >
          {code}
        </text>
      </svg>

      {coord.landmark && (
        <p className="mt-2 text-center text-xs text-muted">
          <span className="font-medium text-foreground">{label}</span>
          <span className="mx-1">·</span>
          {coord.landmark}
        </p>
      )}
    </div>
  );
}

// Tiny silhouette reused inside zoom view — must match BodyMap's silhouette scale.
function MiniSilhouette({ view }: { view: "front" | "back" }) {
  const fill = view === "back" ? "#eef2f7" : "#f8fafc";
  const stroke = "#cbd5e1";
  return (
    <g>
      <ellipse cx={150} cy={58} rx={32} ry={40} fill={fill} stroke={stroke} strokeWidth={0.5} />
      <rect x={137} y={92} width={26} height={22} fill={fill} stroke={stroke} strokeWidth={0.5} />
      <path
        d="M 110 120 Q 95 130 90 165 L 90 260 Q 95 320 110 360 L 190 360 Q 205 320 210 260 L 210 165 Q 205 130 190 120 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
      />
      <path
        d="M 92 140 Q 75 190 75 260 Q 72 320 70 370 L 88 370 Q 92 320 95 260 Q 100 200 110 150 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
      />
      <path
        d="M 208 140 Q 225 190 225 260 Q 228 320 230 370 L 212 370 Q 208 320 205 260 Q 200 200 190 150 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
      />
      <ellipse cx={78} cy={390} rx={15} ry={20} fill={fill} stroke={stroke} strokeWidth={0.5} />
      <ellipse cx={222} cy={390} rx={15} ry={20} fill={fill} stroke={stroke} strokeWidth={0.5} />
      <path
        d="M 108 360 L 190 360 Q 200 380 198 410 L 155 420 L 102 410 Q 100 380 108 360 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
      />
      <path
        d="M 110 415 L 148 415 L 145 560 Q 142 620 135 680 L 115 680 Q 118 620 115 560 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
      />
      <path
        d="M 152 415 L 190 415 L 185 560 Q 182 620 175 680 L 155 680 Q 158 620 155 560 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
      />
      <ellipse cx={125} cy={688} rx={18} ry={8} fill={fill} stroke={stroke} strokeWidth={0.5} />
      <ellipse cx={170} cy={688} rx={18} ry={8} fill={fill} stroke={stroke} strokeWidth={0.5} />
    </g>
  );
}

// Skin cross-section + needle insertion diagram.
function NeedleDiagram({
  angle,
  depth,
  color,
  labels,
}: {
  angle: number;
  depth: number;
  color: string;
  labels: {
    angle: string;
    depth: string;
    perpendicular: string;
    oblique: string;
    transverse: string;
    skin: string;
    subcutaneous: string;
    muscle: string;
  };
}) {
  // Canvas: 300x200. Skin at y=50. Layers below.
  // Needle enters from above-right, tip goes to depth below skin.
  // angle: 0 (perpendicular) = straight down. 45 = oblique. 90 = flat (transverse).
  const depthPx = Math.min(depth * 30, 110); // 1 cun ≈ 30 px
  const rad = (angle * Math.PI) / 180;
  const tipX = 150 + Math.sin(rad) * depthPx;
  const tipY = 50 + Math.cos(rad) * depthPx;
  // Needle tail extends back 120 px
  const tailX = 150 - Math.sin(rad) * 120;
  const tailY = 50 - Math.cos(rad) * 120;

  const angleLabel =
    angle === 0 ? labels.perpendicular : angle >= 90 ? labels.transverse : labels.oblique;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <svg viewBox="0 0 300 200" className="w-full max-w-sm mx-auto">
        {/* Skin layers */}
        <rect x={0} y={50} width={300} height={18} fill="#fde2d3" />
        <rect x={0} y={68} width={300} height={30} fill="#fcd3b8" />
        <rect x={0} y={98} width={300} height={90} fill="#f0b48a" />

        {/* Skin surface line */}
        <line x1={0} y1={50} x2={300} y2={50} stroke="#b45309" strokeWidth={1} />

        {/* Layer labels */}
        <text x={6} y={62} fontSize={8} fill="#7c2d12">{labels.skin}</text>
        <text x={6} y={85} fontSize={8} fill="#7c2d12">{labels.subcutaneous}</text>
        <text x={6} y={120} fontSize={8} fill="#7c2d12">{labels.muscle}</text>

        {/* Depth ruler */}
        <g stroke="#9ca3af" strokeWidth={0.5}>
          {[1, 2, 3].map((c) => (
            <g key={c}>
              <line x1={265} y1={50 + c * 30} x2={275} y2={50 + c * 30} />
              <text x={278} y={50 + c * 30 + 3} fontSize={7} fill="#6b7280">{c}寸</text>
            </g>
          ))}
        </g>

        {/* Needle */}
        <line
          x1={tailX}
          y1={tailY}
          x2={tipX}
          y2={tipY}
          stroke="#374151"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Needle handle (thicker) */}
        <line
          x1={tailX}
          y1={tailY}
          x2={tailX + Math.sin(rad) * 25}
          y2={tailY + Math.cos(rad) * 25}
          stroke="#fbbf24"
          strokeWidth={4.5}
          strokeLinecap="round"
        />
        {/* Insertion point */}
        <circle cx={150} cy={50} r={3} fill={color} stroke="#fff" strokeWidth={1} />

        {/* Angle arc */}
        <path
          d={`M 170 50 A 20 20 0 0 0 ${150 + 20 * Math.sin(rad)} ${50 + 20 * Math.cos(rad)}`}
          fill="none"
          stroke="#6b7280"
          strokeWidth={0.8}
          strokeDasharray="2 2"
        />
      </svg>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-md bg-primary/5 p-2 text-center">
          <div className="text-muted">{labels.angle}</div>
          <div className="font-semibold mt-0.5">
            {angle}° · {angleLabel}
          </div>
        </div>
        <div className="rounded-md bg-primary/5 p-2 text-center">
          <div className="text-muted">{labels.depth}</div>
          <div className="font-semibold mt-0.5">{depth} 寸</div>
        </div>
      </div>
    </div>
  );
}

// Cun (body-inch) reference ruler — classical proportional measurement.
function CunRuler({
  hint,
  title,
  landmarks,
}: {
  hint: string;
  title: string;
  landmarks: [string, string][];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted mb-3">{hint}</p>

      {/* 12-cun visual scale (classic forearm reference: elbow crease → wrist = 12 cun) */}
      <div className="mb-4">
        <div className="flex items-end justify-between text-xs text-muted mb-1">
          <span>肘橫紋</span>
          <span>12 寸</span>
          <span>腕橫紋</span>
        </div>
        <div className="relative h-8 rounded-md bg-gradient-to-r from-amber-100 to-amber-200 border border-amber-300">
          {Array.from({ length: 13 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-amber-500/60"
              style={{ left: `${(i / 12) * 100}%` }}
            >
              {i % 3 === 0 && (
                <span className="absolute -bottom-4 left-0.5 text-[9px] text-amber-900">{i}</span>
              )}
            </div>
          ))}
          {/* 4-finger (3 cun) reference */}
          <div
            className="absolute top-1 bottom-1 rounded bg-teal-500/30 border border-teal-600"
            style={{ left: "0%", width: `${(3 / 12) * 100}%` }}
          >
            <span className="absolute -top-4 left-1 text-[9px] text-teal-700 font-medium">
              四橫指 = 3寸
            </span>
          </div>
          {/* Thumb (1 cun) reference */}
          <div
            className="absolute top-1 bottom-1 rounded bg-rose-500/30 border border-rose-600"
            style={{ left: `${(3 / 12) * 100}%`, width: `${(1 / 12) * 100}%` }}
          >
            <span className="absolute -top-4 left-0 text-[9px] text-rose-700 font-medium">
              拇指 = 1寸
            </span>
          </div>
        </div>
      </div>

      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      <ul className="divide-y divide-border text-xs">
        {landmarks.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between py-1.5">
            <span className="text-muted">{k}</span>
            <span className="font-mono font-medium">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
