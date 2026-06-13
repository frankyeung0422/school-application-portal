"use client";

// Concentric 君臣佐使 wheel.
import Link from "next/link";

interface Herb {
  id: string;
  role: "JUN" | "CHEN" | "ZUO" | "SHI";
  pinyinName: string;
  chineseName: string;
  dosage?: string | null;
}

const ROLE_RADIUS: Record<Herb["role"], [number, number]> = {
  JUN: [0, 40],
  CHEN: [40, 70],
  ZUO: [70, 100],
  SHI: [100, 128],
};
const ROLE_FILL: Record<Herb["role"], string> = {
  JUN: "#fecaca",
  CHEN: "#fed7aa",
  ZUO: "#bfdbfe",
  SHI: "#bbf7d0",
};
const ROLE_LABEL: Record<Herb["role"], string> = {
  JUN: "君",
  CHEN: "臣",
  ZUO: "佐",
  SHI: "使",
};

interface Props {
  herbs: Herb[];
  locale: "zh-Hant" | "en";
  title: string;
}

export function CompositionWheel({ herbs, locale, title }: Props) {
  const grouped: Record<Herb["role"], Herb[]> = { JUN: [], CHEN: [], ZUO: [], SHI: [] };
  for (const h of herbs) grouped[h.role].push(h);

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;

  const ringsOrder: Herb["role"][] = ["JUN", "CHEN", "ZUO", "SHI"];

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 items-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs mx-auto">
          {ringsOrder.map((role) => {
            const [rIn, rOut] = ROLE_RADIUS[role];
            const list = grouped[role];
            return (
              <g key={role}>
                <circle cx={cx} cy={cy} r={rOut} fill={ROLE_FILL[role]} stroke="#fff" strokeWidth={2} />
                {rIn > 0 && <circle cx={cx} cy={cy} r={rIn} fill="#fff" />}
                {list.length > 0 &&
                  list.map((h, i) => {
                    const angle = (Math.PI * 2 * i) / list.length - Math.PI / 2;
                    const midR = (rIn + rOut) / 2;
                    const x = cx + Math.cos(angle) * midR;
                    const y = cy + Math.sin(angle) * midR;
                    const name = locale === "zh-Hant" ? h.chineseName : h.pinyinName;
                    return (
                      <text
                        key={h.id}
                        x={x}
                        y={y}
                        fontSize={9}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#111"
                      >
                        {name.slice(0, 4)}
                      </text>
                    );
                  })}
              </g>
            );
          })}
          <text x={cx} y={cy + 4} fontSize={14} fontWeight={700} textAnchor="middle" fill="#7c2d12">
            方
          </text>
        </svg>

        <div className="space-y-2 text-xs">
          {ringsOrder.map((role) => (
            <div key={role} className="rounded-md border border-border p-2">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-3 h-3 rounded"
                  style={{ background: ROLE_FILL[role] }}
                />
                <span className="font-semibold">
                  {ROLE_LABEL[role]} · {role}
                </span>
                <span className="text-muted ml-auto">{grouped[role].length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {grouped[role].map((h) => (
                  <Link
                    key={h.id}
                    href={`/herbs/${h.id}`}
                    className="rounded border border-border bg-background px-1.5 py-0.5 hover:border-primary-light"
                  >
                    {locale === "zh-Hant" ? h.chineseName : h.pinyinName}
                    {h.dosage && <span className="ml-1 text-muted">{h.dosage}</span>}
                  </Link>
                ))}
                {grouped[role].length === 0 && <span className="text-muted">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
