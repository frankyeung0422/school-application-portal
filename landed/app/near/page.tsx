import { NearbyPanel } from "@/components/storefront/nearby";
import { PageTitle } from "@/components/ui";
import { worthBuyingNow } from "@/lib/deals/service";
import { CUISINES, HK_DISTRICTS } from "@/lib/food/rank";
import { OSM_ATTRIBUTION } from "@/lib/stores/overpass";

export const dynamic = "force-dynamic";

export default async function NearPage() {
  const deals = await worthBuyingNow(12);
  return (
    <div className="space-y-6">
      <PageTitle
        title="附近抵食 · 而家抵買 Nearby"
        sub="用你嘅位置搵附近又平又好食嘅餐廳，同埋有價格紀錄證明而家真係抵買嘅貨品，連最近分店。"
      />
      <NearbyPanel deals={deals} districts={HK_DISTRICTS} cuisines={CUISINES.map(({ code, zh }) => ({ code, zh }))} />
      <p className="text-xs text-slate-400">{OSM_ATTRIBUTION}</p>
    </div>
  );
}
