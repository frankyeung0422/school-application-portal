import { prisma } from "@/lib/prisma";
import { supplierReliability } from "@/lib/catalog";
import { pct } from "@/lib/format";
import { FULFILMENT_MODES } from "@/lib/types";
import { Notice, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { offers: true } } },
    orderBy: [{ fulfilmentMode: "desc" }, { ordersPlaced: "desc" }],
  });
  return (
    <div className="space-y-4">
      <PageTitle title="供應商 Suppliers" sub="預設全部只做聯盟連結。審核過（試單、溝通、退貨政策）先改做 MANUAL_ASSISTED。" />
      <Notice>
        API 模式暫時未有已連接嘅供應商接口 — 設為 API 嘅訂單會喺執行時被拒絕。API mode has no connected supplier adapter yet; keep vetted suppliers on MANUAL_ASSISTED.
      </Notice>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>供應商</th><th>平台</th><th>來源數</th><th>落單/完成</th><th>履約率</th><th>模式</th></tr></thead>
          <tbody>
            {suppliers.map((s) => {
              const rel = supplierReliability(s);
              return (
                <tr key={s.id}>
                  <td>{s.shopName}</td>
                  <td>{s.platform}</td>
                  <td>{s._count.offers}</td>
                  <td>{s.ordersPlaced} / {s.ordersFilled}</td>
                  <td>{rel == null ? "未夠 3 單" : pct(rel)}</td>
                  <td>
                    <OpForm
                      op="supplierMode"
                      hidden={{ supplierId: s.id }}
                      fields={[{ name: "mode", label: "", type: "select", options: [...FULFILMENT_MODES], defaultValue: s.fulfilmentMode, width: "w-44" }]}
                      label="設定"
                      tone="secondary"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
