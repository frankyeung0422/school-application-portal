import type { Locale } from "@/lib/i18n/types";

interface Props {
  locale?: Locale;
  size?: number;
}

const PAIRS: Array<{ yin: { zh: string; en: string }; yang: { zh: string; en: string } }> = [
  { yin: { zh: "寒", en: "Cold" }, yang: { zh: "熱", en: "Heat" } },
  { yin: { zh: "裏", en: "Interior" }, yang: { zh: "表", en: "Exterior" } },
  { yin: { zh: "虛", en: "Deficiency" }, yang: { zh: "實", en: "Excess" } },
  { yin: { zh: "靜", en: "Stillness" }, yang: { zh: "動", en: "Activity" } },
  { yin: { zh: "下降", en: "Descending" }, yang: { zh: "上升", en: "Ascending" } },
];

/** Taiji symbol + the 八綱-style Yin/Yang attribute pairs. Static SVG. */
export function YinYangBalance({ locale = "en", size = 200 }: Props) {
  const isZh = locale === "zh-Hant";
  const c = 100;

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">
          {isZh ? "陰陽" : "Yin & Yang"}
        </h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          {isZh
            ? "陰陽是中醫綱領：對立互根、消長轉化。辨證八綱皆由此分。"
            : "Yin–Yang is the root framework: opposing yet interdependent, waxing and waning. The eight diagnostic principles derive from it."}
        </p>
      </figcaption>

      <div className="grid gap-4 sm:grid-cols-[auto,1fr] items-center">
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          role="img"
          aria-label={isZh ? "太極圖" : "Taiji symbol"}
          className="block mx-auto"
        >
          {/* Yang (white) background half, Yin (dark) foreground via path */}
          <circle cx={c} cy={c} r={96} fill="#f8fafc" stroke="#1e293b" strokeWidth={2} />
          <path
            d="M100 4 A96 96 0 0 1 100 196 A48 48 0 0 1 100 100 A48 48 0 0 0 100 4 Z"
            fill="#1e293b"
          />
          <circle cx={c} cy={52} r={14} fill="#1e293b" />
          <circle cx={c} cy={148} r={14} fill="#f8fafc" />
          <text x={148} y={70} textAnchor="middle" fontSize="20" fontWeight={700} fill="#1e293b">
            {isZh ? "陽" : "Yang"}
          </text>
          <text x={52} y={140} textAnchor="middle" fontSize="20" fontWeight={700} fill="#f8fafc">
            {isZh ? "陰" : "Yin"}
          </text>
        </svg>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted">
              <th className="py-1 text-left font-semibold text-slate-600">{isZh ? "陰" : "Yin"}</th>
              <th className="py-1 text-right font-semibold">{isZh ? "陽" : "Yang"}</th>
            </tr>
          </thead>
          <tbody>
            {PAIRS.map((p) => (
              <tr key={p.yin.en} className="border-t border-border/60">
                <td className="py-1.5 text-left">{isZh ? p.yin.zh : p.yin.en}</td>
                <td className="py-1.5 text-right font-medium">{isZh ? p.yang.zh : p.yang.en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
