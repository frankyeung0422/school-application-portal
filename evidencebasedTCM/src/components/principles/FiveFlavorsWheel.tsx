import type { Locale } from "@/lib/i18n/types";
import {
  FLAVOR_ACTIONS,
  ELEMENT_COLOR,
  ELEMENT_LABEL,
  type Element,
} from "@/lib/tcm/herb-action-heuristics";

interface Props {
  locale?: Locale;
  size?: number;
}

// 五味 → 五行 → 臟 correspondences (《素問·宣明五氣》).
const FLAVORS: Array<{
  flavor: string; zh: string; en: string; element: Element; zang: string; zangEn: string; pos: number;
}> = [
  { flavor: "sour", zh: "酸", en: "Sour", element: "wood", zang: "肝", zangEn: "Liver", pos: 0 },
  { flavor: "bitter", zh: "苦", en: "Bitter", element: "fire", zang: "心", zangEn: "Heart", pos: 1 },
  { flavor: "sweet", zh: "甘", en: "Sweet", element: "earth", zang: "脾", zangEn: "Spleen", pos: 2 },
  { flavor: "pungent", zh: "辛", en: "Pungent", element: "metal", zang: "肺", zangEn: "Lung", pos: 3 },
  { flavor: "salty", zh: "鹹", en: "Salty", element: "water", zang: "腎", zangEn: "Kidney", pos: 4 },
];

/** 五味 wheel — flavor → element/organ → action. Static SVG. */
export function FiveFlavorsWheel({ locale = "en", size = 300 }: Props) {
  const isZh = locale === "zh-Hant";
  const W = 300;
  const cx = W / 2;
  const cy = W / 2;
  const R = 100;
  const angleAt = (pos: number) => -Math.PI / 2 + (pos * 2 * Math.PI) / 5;

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{isZh ? "五味" : "Five Flavors"}</h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          {isZh
            ? "五味各入其臟、各有趨向：辛散、甘補、苦泄、酸收、鹹軟。"
            : "Each flavor enters its organ and has a directional action: pungent disperses, sweet tonifies, bitter drains, sour astringes, salty softens."}
        </p>
      </figcaption>

      <div className="grid gap-4 sm:grid-cols-[auto,1fr] items-center">
        <svg viewBox={`0 0 ${W} ${W}`} width={size} height={size} role="img" aria-label={isZh ? "五味五行圖" : "Five flavors wheel"} className="block mx-auto">
          {FLAVORS.map((f) => {
            const a = angleAt(f.pos);
            const x = cx + R * Math.cos(a);
            const y = cy + R * Math.sin(a);
            return (
              <g key={f.flavor}>
                <circle cx={x} cy={y} r={30} fill={ELEMENT_COLOR[f.element]} stroke="#fff" strokeWidth={2} />
                <text x={x} y={y - 2} textAnchor="middle" fontSize="20" fontWeight={700} fill="#fff">
                  {isZh ? f.zh : f.en.slice(0, 4)}
                </text>
                <text x={x} y={y + 14} textAnchor="middle" fontSize="9" fill="#fff" fontWeight={600}>
                  {isZh ? f.zang : f.zangEn}
                </text>
              </g>
            );
          })}
        </svg>

        <ul className="space-y-1.5 text-xs">
          {FLAVORS.map((f) => (
            <li key={f.flavor} className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: ELEMENT_COLOR[f.element] }} />
              <span>
                <span className="font-semibold">
                  {isZh ? `${f.zh}（${ELEMENT_LABEL[f.element].zh}·${f.zang}）` : `${f.en} (${ELEMENT_LABEL[f.element].en} · ${f.zangEn})`}
                </span>
                <span className="block text-muted">
                  {isZh ? FLAVOR_ACTIONS[f.flavor].actionZh : FLAVOR_ACTIONS[f.flavor].actionEn}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
