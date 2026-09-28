import Link from "next/link";
import { BasketPage } from "@/components/storefront/basket";
import { DigestToggle } from "@/components/storefront/digest-toggle";
import { PageTitle } from "@/components/ui";
import { currentCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OPW_ATTRIBUTION, RETAILERS, retailerName } from "@/lib/supermarket/retailers";

export const dynamic = "force-dynamic";

export default async function Basket() {
  const names = Object.fromEntries(RETAILERS.map((r) => [r, retailerName(r)]));
  const me = await currentCustomer();
  const saved = me ? await prisma.savedBasket.findUnique({ where: { customerId: me.id }, select: { digestOptIn: true } }) : null;
  return (
    <div className="space-y-6">
      <PageTitle title="購物清單 Basket comparison" sub="成張清單喺邊間超市買最平？一間買晒 vs 分開買，優惠已計。Which shop is cheapest for your whole list?" />
      <div className="card flex flex-wrap items-center justify-between gap-3 border-brand-100 bg-emerald-50/60">
        <div>
          <div className="font-semibold">📬 每星期慳錢清單 Weekly basket digest</div>
          <p className="text-sm text-slate-600">每個星期將你張清單重新格價：邊間最平、邊件有優惠、邊件縮水咗 — 經 Telegram 或電郵。</p>
        </div>
        {me ? (
          <DigestToggle initial={saved?.digestOptIn ?? false} telegramLinked={Boolean(me.telegramChatId)} />
        ) : (
          <div className="flex gap-2">
            <Link href="/register?next=/basket" className="btn-primary">免費登記 Sign up</Link>
            <Link href="/login?next=/basket" className="btn-secondary">登入</Link>
          </div>
        )}
      </div>
      <BasketPage retailerNames={names} />
      <p className="text-xs text-slate-500">{OPW_ATTRIBUTION}</p>
    </div>
  );
}
