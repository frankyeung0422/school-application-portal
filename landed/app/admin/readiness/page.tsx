import { getReadiness } from "@/lib/readiness";
import { Badge, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReadinessPage() {
  const items = await getReadiness();
  const ok = items.filter((i) => i.ok).length;
  return (
    <div className="space-y-4">
      <PageTitle title="就緒清單 Readiness" sub={`${ok}/${items.length} ready — each missing item says exactly what it unlocks.`} />
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.key} className="card flex flex-wrap items-start gap-3 p-4 text-sm">
            <Badge tone={i.ok ? "green" : "amber"}>{i.ok ? "✓" : "未完成"}</Badge>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{i.label}</div>
              <div className="text-slate-600">{i.detail}</div>
              <div className="text-xs text-slate-500">解鎖 Unlocks: {i.unlocks}</div>
              {i.action && !i.ok ? <div className="mt-1 text-xs font-medium text-amber-800">→ {i.action}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
