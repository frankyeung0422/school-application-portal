import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { FiveElementCycle } from "@/components/shared/FiveElementCycle";
import { YinYangBalance } from "@/components/principles/YinYangBalance";
import { FourNaturesSpectrum } from "@/components/principles/FourNaturesSpectrum";
import { FiveFlavorsWheel } from "@/components/principles/FiveFlavorsWheel";

export const metadata: Metadata = {
  title: "中醫基礎理論 | EBTCM",
  description: "陰陽、五行、四氣五味等中醫核心理論的視覺化圖解。",
};

export default async function PrinciplesPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";

  const sections: Array<{ id: string; title: string; blurb: string; node: React.ReactNode }> = [
    {
      id: "yinyang",
      title: isZh ? "陰陽" : "Yin & Yang",
      blurb: isZh
        ? "中醫一切辨證的總綱。萬物分陰陽，疾病不離陰陽之偏盛偏衰。"
        : "The master framework behind all pattern differentiation — every sign sorts into Yin or Yang.",
      node: <YinYangBalance locale={locale} />,
    },
    {
      id: "wuxing",
      title: isZh ? "五行" : "Five Elements",
      blurb: isZh
        ? "木火土金水的相生相剋，描述五臟之間的滋生與制約關係。"
        : "Generating and controlling cycles of Wood-Fire-Earth-Metal-Water describe how the five Zang organs nourish and restrain each other.",
      node: <FiveElementCycle locale={locale} cycle="both" />,
    },
    {
      id: "siqi",
      title: isZh ? "四氣" : "Four Natures",
      blurb: isZh
        ? "藥物的寒熱溫涼，決定其針對寒證或熱證的治療方向。"
        : "A herb's thermal nature dictates whether it treats cold or heat patterns.",
      node: <FourNaturesSpectrum locale={locale} />,
    },
    {
      id: "wuwei",
      title: isZh ? "五味" : "Five Flavors",
      blurb: isZh
        ? "酸苦甘辛鹹各入五臟、各有升降收散的作用趨向。"
        : "Sour, bitter, sweet, pungent and salty each enter an organ and carry a directional action.",
      node: <FiveFlavorsWheel locale={locale} />,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{isZh ? "中醫基礎理論" : "TCM Foundational Theory"}</h1>
        <p className="mt-2 text-muted">
          {isZh
            ? "以圖解認識中醫核心原理——這些理論是中藥性味歸經與辨證論治的基礎。"
            : "Visual primers on the core principles that underpin herb properties and pattern-based treatment."}
        </p>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-border bg-surface px-3 py-1 hover:border-primary-light transition-colors"
            >
              {s.title}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-20">
            <h2 className="mb-2 text-xl font-semibold">{s.title}</h2>
            <p className="mb-3 text-sm text-muted leading-relaxed">{s.blurb}</p>
            {s.node}
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-border bg-surface/50 p-4 text-sm text-muted">
        {isZh ? (
          <>
            想看某味中藥如何體現這些原理？前往{" "}
            <Link href="/herbs" className="text-primary hover:underline">中藥資料庫</Link>
            ，於任一中藥的「圖表」分頁查看「藥性 → 作用 → 標的 → 機轉」流程圖。
          </>
        ) : (
          <>
            Want to see these principles in a specific herb? Visit the{" "}
            <Link href="/herbs" className="text-primary hover:underline">herb database</Link>
            {" "}and open the “Property → Action → Target → Mechanism” flow on any herb&apos;s Visual tab.
          </>
        )}
      </div>
    </div>
  );
}
