import { prisma } from "@/lib/prisma";
import { commercialSettings, eligibilityThresholds, getFlag } from "@/lib/settings";
import { resolvePolicy } from "@/lib/actions/bus";
import { ACTION_KINDS, ACTION_LABELS, POLICY_FLOOR } from "@/lib/actions/kinds";
import { currentEnvelope } from "@/lib/pools-service";
import { hkd, hoursSince, timeAgo } from "@/lib/format";
import { Badge, Notice, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";
import { RETAILERS, retailerName } from "@/lib/supermarket/retailers";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const retailerCfg = await prisma.retailerConfig.findMany();
  const [runMode, killSwitch, liveUnlocked, s, t, sources, rails, fx, envelope, policies] = await Promise.all([
    getFlag("runMode", "DRY"),
    getFlag("killSwitch", "OFF"),
    getFlag("payments.liveUnlocked", "NO"),
    commercialSettings(),
    eligibilityThresholds(),
    prisma.sourceConfig.findMany({ orderBy: { platform: "asc" } }),
    prisma.fxRail.findMany(),
    prisma.fxQuote.findMany({ orderBy: { base: "asc" } }),
    currentEnvelope(),
    Promise.all(ACTION_KINDS.map(async (k) => ({ kind: k, decision: await resolvePolicy(k), row: await prisma.actionPolicy.findUnique({ where: { kind: k } }) }))),
  ]);

  const flag = (key: string, label: string, value: string | number, type: "number" | "text" = "number") => (
    <OpForm key={key} op="setFlag" hidden={{ key }} fields={[{ name: "value", label, type, defaultValue: value, width: "w-44" }]} label="儲存" tone="secondary" />
  );

  return (
    <div className="space-y-8">
      <PageTitle title="設定 Settings" />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-2 p-4">
          <div className="font-semibold">運行模式 Run mode <Badge tone={runMode === "LIVE" ? "red" : "blue"}>{runMode}</Badge></div>
          <p className="text-xs text-slate-500">LIVE = 批准咗嘅上架、帖文、電郵會真正發出。</p>
          <OpForm op="setFlag" hidden={{ key: "runMode", value: runMode === "LIVE" ? "DRY" : "LIVE" }} label={runMode === "LIVE" ? "改回 DRY" : "切換 LIVE"} tone={runMode === "LIVE" ? "secondary" : "danger"} confirm={runMode === "LIVE" ? undefined : "Switch to LIVE? Approved actions will reach real marketplaces, social accounts and inboxes."} />
        </div>
        <div className="card space-y-2 p-4">
          <div className="font-semibold">緊急停止 Kill switch <Badge tone={killSwitch === "ON" ? "red" : "green"}>{killSwitch}</Badge></div>
          <p className="text-xs text-slate-500">ON = 除落架/調價外全部停止。Stripe 爭議會自動觸發。</p>
          {killSwitch === "ON" ? (
            <OpForm op="killSwitch" hidden={{ state: "OFF" }} label="解除 Reset" tone="secondary" confirm="Reset the kill switch?" />
          ) : (
            <OpForm op="killSwitch" hidden={{ state: "ON" }} fields={[{ name: "reason", label: "原因", width: "w-40" }]} label="觸發 Trip" tone="danger" />
          )}
        </div>
        <div className="card space-y-2 p-4">
          <div className="font-semibold">真實扣款 Live charges <Badge tone={liveUnlocked === "YES" ? "red" : "slate"}>{liveUnlocked}</Badge></div>
          <p className="text-xs text-slate-500">就算放咗 live key，未解鎖都唔會扣真錢。</p>
          <OpForm op="setFlag" hidden={{ key: "payments.liveUnlocked", value: liveUnlocked === "YES" ? "NO" : "YES" }} label={liveUnlocked === "YES" ? "鎖回 Lock" : "解鎖 Unlock"} tone={liveUnlocked === "YES" ? "secondary" : "danger"} confirm={liveUnlocked === "YES" ? undefined : "Allow real card charges with a live Stripe key?"} />
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-bold">商業設定 Commercial</h2>
        <div className="flex flex-wrap gap-6">
          {flag("fx.bufferPct", "匯率緩衝 (0.015=1.5%)", s.fxBufferPct)}
          {flag("pricing.targetMarginPct", "目標利潤", s.targetMarginPct)}
          {flag("fx.settlementRail", "付款渠道", s.settlementRail, "text")}
          {flag("pools.maxAbsorbPct", "拼單最多補貼", s.poolMaxAbsorbPct)}
          {flag("channels.maxRepricePct", "最大自動加價", s.maxRepricePct)}
          {flag("quotes.ttlMinutes", "報價有效分鐘", s.quoteTtlMinutes)}
        </div>
        <h3 className="pt-2 text-sm font-bold">資格門檻 Eligibility thresholds</h3>
        <div className="flex flex-wrap gap-6">
          {flag("eligibility.minWatches", "最少關注", t.minWatches)}
          {flag("eligibility.minClicks", "最少點擊", t.minClicks)}
          {flag("eligibility.minMatch", "最低同款置信度", t.minMatch)}
          {flag("eligibility.minMarginPct", "最低利潤", t.minMarginPct)}
          {flag("eligibility.maxPriceAgeHours", "價格最舊 (小時)", t.maxPriceAgeHours)}
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-bold">資金上限 Capital envelope</h2>
        <p className="text-sm">
          {envelope ? <>v{envelope.version}: <b>{hkd(envelope.maxOpenExposureHkdCents)}</b> ({envelope.note ?? "—"}, {timeAgo(envelope.createdAt)})</> : "未設定 None"}
        </p>
        <OpForm op="envelope" fields={[{ name: "maxHkd", label: "新上限 HK$", type: "number", width: "w-36" }, { name: "note", label: "備註", width: "w-56" }]} label="新版本 New version" tone="secondary" />
        <p className="text-xs text-slate-500">只可以新增版本，唔可以改舊版本。Append-only.</p>
      </section>

      <section className="card overflow-x-auto p-4">
        <h2 className="mb-2 font-bold">來源成本 Source costs</h2>
        <div className="space-y-2">
          {sources.map((src) => (
            <div key={src.platform} className="border-b border-slate-100 pb-2">
              <div className="text-sm font-semibold">{src.platform} <span className="text-xs font-normal text-slate-500">{src.currency} · {src.viaForwarder ? "via forwarder" : "direct"}</span></div>
              <OpForm
                op="sourceConfig"
                hidden={{ platform: src.platform }}
                fields={[
                  { name: "shipToHkHkd", label: "運費 HK$", type: "number", defaultValue: src.shipToHkHkd, width: "w-24" },
                  { name: "freeShipOverNative", label: "免運門檻", type: "number", defaultValue: src.freeShipOverNative, width: "w-24" },
                  { name: "domesticShipNative", label: "內地段", type: "number", defaultValue: src.domesticShipNative, width: "w-20" },
                  { name: "forwarderPerKgHkd", label: "集運/kg", type: "number", defaultValue: src.forwarderPerKgHkd, width: "w-20" },
                  { name: "forwarderMinHkd", label: "集運最低", type: "number", defaultValue: src.forwarderMinHkd, width: "w-20" },
                  { name: "assumedWeightKg", label: "假設 kg", type: "number", defaultValue: src.assumedWeightKg, width: "w-20" },
                  { name: "cardFxMarkupPct", label: "卡外幣費", type: "number", defaultValue: src.cardFxMarkupPct, width: "w-24" },
                  { name: "affiliateCommissionPct", label: "聯盟佣金", type: "number", defaultValue: src.affiliateCommissionPct, width: "w-24" },
                  { name: "officialFreeToPickup", label: "官方集運免運到自提點", type: "checkbox", defaultValue: src.officialFreeToPickup },
                  { name: "officialFreeMaxKg", label: "免運上限 kg", type: "number", defaultValue: src.officialFreeMaxKg, width: "w-20" },
                  { name: "homeDeliverySurchargeHkd", label: "送上門 HK$", type: "number", defaultValue: src.homeDeliverySurchargeHkd, width: "w-20" },
                  { name: "enabled", label: "啟用", type: "checkbox", defaultValue: src.enabled },
                ]}
                label="儲存"
                tone="secondary"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-2 p-4">
          <h2 className="font-bold">付款渠道 FX rails</h2>
          {rails.map((r) => (
            <div key={r.name}>
              <div className="text-sm">{r.name} <span className="text-xs text-slate-500">{r.label}</span></div>
              <OpForm op="fxRail" hidden={{ name: r.name }} fields={[
                { name: "bps", label: "bps", type: "number", defaultValue: r.bps, width: "w-20" },
                { name: "minFeeHkd", label: "最低 HK$", type: "number", defaultValue: r.minFeeHkdCents / 100, width: "w-20" },
                { name: "active", label: "啟用", type: "checkbox", defaultValue: r.active },
              ]} label="儲存" tone="secondary" />
            </div>
          ))}
        </div>
        <div className="card space-y-2 p-4">
          <h2 className="font-bold">匯率 FX mids (HKD per unit)</h2>
          {fx.some((q) => (hoursSince(q.fetchedAt) ?? 0) > 24) ?<Notice>匯率過舊 — 開 worker 或者喺 Jobs 執行 FETCH_FX。</Notice> : null}
          <table className="table">
            <tbody>
              {fx.map((q) => (
                <tr key={q.base}><td>{q.base}</td><td className="tabular-nums">{q.mid.toFixed(5)}</td><td className="text-xs text-slate-500">{q.source} · {timeAgo(q.fetchedAt)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-x-auto p-4">
        <h2 className="mb-2 font-bold">自主權限 Action policies</h2>
        <p className="mb-2 text-xs text-slate-500">代碼底線（floor）同「賺得自主權」永遠優先於呢度嘅設定。Code floors and earned autonomy always apply on top of these rows.</p>
        <table className="table">
          <thead><tr><th>動作</th><th>底線</th><th>生效</th><th>原因</th><th>設定</th></tr></thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.kind}>
                <td>{ACTION_LABELS[p.kind]}</td>
                <td>{POLICY_FLOOR[p.kind] ?? "—"}</td>
                <td><Badge tone={p.decision.mode === "AUTO" ? "green" : p.decision.mode === "BLOCK" ? "red" : "amber"}>{p.decision.mode}</Badge></td>
                <td className="text-xs text-slate-500">{p.decision.reason}</td>
                <td>
                  <OpForm op="policy" hidden={{ kind: p.kind }} fields={[{ name: "mode", label: "", type: "select", options: ["AUTO", "APPROVE", "BLOCK"], defaultValue: p.row?.mode ?? p.decision.mode, width: "w-28" }]} label="設定" tone="secondary" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-bold">超市運費 Supermarket delivery terms</h2>
        <p className="text-xs text-slate-500">留空 = 未知，購物清單比較唔會估。請按各超市網購條款輸入。Blank means unknown — never guessed.</p>
        {RETAILERS.map((code) => {
          const cfg = retailerCfg.find((r) => r.code === code);
          return (
            <OpForm
              key={code}
              op="retailerConfig"
              hidden={{ code }}
              fields={[
                { name: "deliveryFeeHkd", label: `${retailerName(code)} 運費 HK$`, type: "number", defaultValue: cfg?.deliveryFeeCents == null ? null : cfg.deliveryFeeCents / 100, width: "w-44" },
                { name: "freeOverHkd", label: "滿額免運 HK$", type: "number", defaultValue: cfg?.freeDeliveryOverCents == null ? null : cfg.freeDeliveryOverCents / 100, width: "w-32" },
              ]}
              label="儲存"
              tone="secondary"
            />
          );
        })}
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-bold">記錄聯盟佣金 Record reported affiliate commission</h2>
        <p className="text-xs text-slate-500">只記錄平台報告並已確認嘅佣金，要附報告編號（重複編號會被忽略）。Only commissions a programme has reported, with its reference.</p>
        <OpForm op="affiliate" fields={[
          { name: "platform", label: "平台", type: "select", options: ["AMAZON", "EBAY", "ALIEXPRESS", "TAOBAO"], width: "w-36" },
          { name: "amountHkd", label: "金額 HK$", type: "number", width: "w-28" },
          { name: "reference", label: "報告編號 Reference", width: "w-48" },
        ]} label="入賬 Book" />
      </section>
    </div>
  );
}
