import Link from "next/link";
import type { Product } from "@prisma/client";
import { hkd, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui";

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link href={`/p/${p.slug}`} className="card group flex gap-4 p-4 transition hover:border-brand-500">
      {p.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.imageUrl} alt="" className="h-20 w-20 flex-none rounded-xl bg-slate-100 object-cover" />
      ) : (
        <div className="h-20 w-20 flex-none rounded-xl bg-slate-100" />
      )}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-medium group-hover:text-brand-700">{p.title}</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          {p.bestLandedHkdCents != null ? (
            <span className="text-lg font-bold tabular-nums text-brand-700">{hkd(p.bestLandedHkdCents)}</span>
          ) : (
            <span className="text-sm text-slate-400">未有可信價格</span>
          )}
          <span className="text-xs text-slate-500">到手價 · {p.sourceCount} 個來源 · {timeAgo(p.lastPricedAt)}</span>
        </div>
        <div className="mt-1 flex gap-1">
          {p.fulfilMode === "FULFIL" ? <Badge tone="green">可代買 Buy here</Badge> : null}
          {p.restricted ? <Badge tone="red">受限 Restricted</Badge> : null}
        </div>
      </div>
    </Link>
  );
}
