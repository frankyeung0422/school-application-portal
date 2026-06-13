import Link from "next/link";
import { buildDiscoveryBoard, type DiscoveryPair } from "@/lib/research/discovery";
import { targetSourceMap, geneChipClass, type TargetSource } from "@/lib/research/network-pharmacology";
import { CredibilityBadge } from "@/components/research/CredibilityBadge";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

function PairRow({ p, S, src, locale }: { p: DiscoveryPair; S: (zh: string, en: string) => string; src: Map<string, TargetSource>; locale: string }) {
  const href = p.kind === "herb" ? `/herbs/${p.entityId}` : `/formulas/${p.entityId}`;
  return (
    <tr className="hover:bg-surface/50">
      <td className="px-3 py-2">
        <Link href={href} className="font-medium hover:text-primary">
          {p.entityName}
        </Link>
      </td>
      <td className="px-3 py-2">
        <Link href={`/research/${p.diseaseId}`} className="text-muted hover:text-primary">
          {p.diseaseName}
        </Link>
      </td>
      <td className="px-3 py-2 text-center">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{p.overlap}</span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CredibilityBadge tier={p.credibility.tier} score={p.credibility.score} locale={locale} title={p.credibility.rationale} />
          {p.novel && <span className="text-[10px] text-amber-700">{S("新候選", "novel")}</span>}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {p.sharedGenes.slice(0, 8).map((g) => (
            <span key={g} className={`rounded px-1.5 py-0.5 text-[11px] font-mono ${geneChipClass(src.get(g))}`}>
              {g}
            </span>
          ))}
          {p.sharedGenes.length > 8 && <span className="text-[11px] text-muted">+{p.sharedGenes.length - 8}</span>}
        </div>
      </td>
    </tr>
  );
}

export default async function DiscoveryBoardPage() {
  const locale = await getLocale();
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);
  const board = await buildDiscoveryBoard();
  const src = await targetSourceMap();

  // Lead with novel candidates (the discovery value); cap for readability.
  const herbNovel = board.herbPairs.filter((p) => p.novel).slice(0, 25);
  const formulaNovel = board.formulaPairs.filter((p) => p.novel).slice(0, 25);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <nav className="text-sm text-muted">
        <Link href="/research" className="hover:text-primary">
          {S("創新治療研究", "Innovation Research")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{S("重定位探索", "Repurposing Discovery")}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold">{S("中藥重定位探索板", "Repurposing Discovery Board")}</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-3xl">
          {S(
            `跨全部 ${board.diseasesCovered} 種疾病，依「中藥/方劑→分子靶點」與疾病基因集的重疊程度，排序出最具潛力的治療配對。「新候選」表示靶點高度吻合，但資料庫尚無直接臨床實證連結——即潛在的「新治療方向」假設，須經文獻與實驗驗證。`,
            `Across all ${board.diseasesCovered} diseases, ranks the strongest herb/formula→disease pairs by molecular-target overlap with the disease gene set. "Novel" = strong target match but no existing clinical-evidence link — i.e. hypothesis-grade leads for new treatment directions, pending validation.`,
          )}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: S("覆蓋疾病", "Diseases"), value: board.diseasesCovered },
          { label: S("新候選中藥配對", "Novel herb leads"), value: board.novelHerbCount },
          { label: S("新候選方劑配對", "Novel formula leads"), value: board.novelFormulaCount },
          { label: S("最低靶點重疊", "Min target overlap"), value: board.minOverlap },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums">{c.value}</div>
            <div className="text-xs text-muted mt-1">{c.label}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">{S("新候選中藥 → 疾病", "Novel Herb → Disease Leads")}</h2>
        {herbNovel.length === 0 ? (
          <p className="text-sm text-muted">{S("暫無達標的新候選配對。", "No qualifying novel leads yet.")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-left">{S("中藥", "Herb")}</th>
                  <th className="px-3 py-2 text-left">{S("疾病", "Disease")}</th>
                  <th className="px-3 py-2 text-center">{S("靶點重疊", "Overlap")}</th>
                  <th className="px-3 py-2 text-left">{S("狀態", "Status")}</th>
                  <th className="px-3 py-2 text-left">{S("共享靶點", "Shared targets")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {herbNovel.map((p) => (
                  <PairRow key={`${p.entityId}-${p.diseaseId}`} p={p} S={S} src={src} locale={locale} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">{S("新候選方劑 → 疾病 (多成分協同)", "Novel Formula → Disease Leads (multi-component)")}</h2>
        {formulaNovel.length === 0 ? (
          <p className="text-sm text-muted">{S("暫無達標的新候選配對。", "No qualifying novel leads yet.")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-left">{S("方劑", "Formula")}</th>
                  <th className="px-3 py-2 text-left">{S("疾病", "Disease")}</th>
                  <th className="px-3 py-2 text-center">{S("靶點重疊", "Overlap")}</th>
                  <th className="px-3 py-2 text-left">{S("狀態", "Status")}</th>
                  <th className="px-3 py-2 text-left">{S("共享靶點", "Shared targets")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {formulaNovel.map((p) => (
                  <PairRow key={`${p.entityId}-${p.diseaseId}`} p={p} S={S} src={src} locale={locale} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="text-xs text-muted border-t border-border pt-4">
        {S(
          "本板為基於網絡藥理靶點重疊的假設生成工具，非臨床建議。配對需經系統文獻回顧、分子對接與臨床研究驗證後方可應用。",
          "This board is a network-pharmacology hypothesis-generation tool, not clinical advice. Leads require systematic review, molecular docking, and clinical validation before any application.",
        )}
      </footer>
    </div>
  );
}
