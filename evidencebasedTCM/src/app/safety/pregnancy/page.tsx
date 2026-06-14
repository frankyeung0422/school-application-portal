import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/shared/Badge";
import { getLocale } from "@/lib/i18n/locale-server";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";

export const metadata = { title: "妊娠安全 | EBTCM" };

export default async function PregnancySafetyPage() {
  const locale = await getLocale();
  const zh = locale === "zh-Hant";

  // Herbs with explicit pregnancy contraindications
  const herbs = await prisma.herb.findMany({
    where: {
      status: "PUBLISHED",
      contraindications: {
        some: {
          pregnancyCategory: { in: ["CONTRAINDICATED", "CAUTION"] },
        },
      },
    },
    select: {
      id: true,
      pinyinName: true,
      chineseName: true,
      toxicityClass: true,
      contraindications: {
        where: { pregnancyCategory: { in: ["CONTRAINDICATED", "CAUTION"] } },
        select: {
          pregnancyCategory: true,
          condition: true,
          severity: true,
          description: true,
        },
      },
    },
    orderBy: { pinyinName: "asc" },
  });

  // Acupoints contraindicated in pregnancy
  const acupoints = await prisma.acupuncturePoint.findMany({
    where: { pregnancyContraindicated: true, status: "PUBLISHED" },
    select: { id: true, code: true, pinyinName: true, chineseName: true, meridian: true },
    orderBy: { code: "asc" },
  });

  const contraHerbs = herbs.filter((h) =>
    h.contraindications.some((c) => c.pregnancyCategory === "CONTRAINDICATED")
  );
  const cautionHerbs = herbs.filter((h) =>
    h.contraindications.every((c) => c.pregnancyCategory !== "CONTRAINDICATED") &&
    h.contraindications.some((c) => c.pregnancyCategory === "CAUTION")
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/safety/check" className="hover:text-primary">
          {zh ? "安全查詢" : "Safety Check"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{zh ? "妊娠安全" : "Pregnancy Safety"}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-2">{zh ? "妊娠安全儀表板" : "Pregnancy Safety Dashboard"}</h1>
      <p className="text-muted mb-6 text-sm">
        {zh
          ? "彙整本資料庫中有孕婦禁忌或需謹慎使用的中藥與穴位。僅供參考，請依個案由醫師評估。"
          : "Herbs and acupoints with documented pregnancy contraindications or cautions. For reference only — clinical assessment required."}
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{contraHerbs.length}</div>
          <div className="text-xs text-red-600 mt-1">{zh ? "孕婦禁用中藥" : "Herbs — Contraindicated"}</div>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
          <div className="text-3xl font-bold text-yellow-700">{cautionHerbs.length}</div>
          <div className="text-xs text-yellow-600 mt-1">{zh ? "孕婦慎用中藥" : "Herbs — Caution"}</div>
        </div>
        <div className="rounded-lg border border-pink-200 bg-pink-50 p-4 text-center">
          <div className="text-3xl font-bold text-pink-700">{acupoints.length}</div>
          <div className="text-xs text-pink-600 mt-1">{zh ? "孕婦禁針穴位" : "Acupoints — Contraindicated"}</div>
        </div>
      </div>

      {/* Contraindicated herbs */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-red-700">
          🚫 {zh ? "孕婦禁用中藥" : "Herbs — Pregnancy Contraindicated"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {contraHerbs.map((herb) => {
            const name = zh ? toTraditionalChinese(herb.chineseName, locale) : herb.pinyinName;
            const alt = zh ? herb.pinyinName : toTraditionalChinese(herb.chineseName, locale);
            return (
              <Link
                key={herb.id}
                href={`/herbs/${herb.id}`}
                className="rounded-lg border border-red-200 bg-red-50 p-3 hover:border-red-400 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-medium">{name}</span>
                    <span className="text-sm text-muted ml-2">{alt}</span>
                  </div>
                  {herb.toxicityClass && herb.toxicityClass !== "無毒" && (
                    <Badge
                      label={herb.toxicityClass}
                      color={
                        herb.toxicityClass === "大毒"
                          ? "bg-red-200 text-red-900 border-red-400"
                          : herb.toxicityClass === "有毒"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-yellow-100 text-yellow-800"
                      }
                    />
                  )}
                </div>
                {herb.contraindications.map((c, i) => c.description ? (
                  <p key={i} className="mt-1 text-xs text-red-700">{c.description}</p>
                ) : null)}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Caution herbs */}
      {cautionHerbs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-yellow-700">
            ⚠ {zh ? "孕婦慎用中藥" : "Herbs — Use With Caution In Pregnancy"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {cautionHerbs.map((herb) => {
              const name = zh ? toTraditionalChinese(herb.chineseName, locale) : herb.pinyinName;
              const alt = zh ? herb.pinyinName : toTraditionalChinese(herb.chineseName, locale);
              return (
                <Link
                  key={herb.id}
                  href={`/herbs/${herb.id}`}
                  className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 hover:border-yellow-400 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium">{name}</span>
                      <span className="text-sm text-muted ml-2">{alt}</span>
                    </div>
                    {herb.toxicityClass && herb.toxicityClass !== "無毒" && (
                      <Badge label={herb.toxicityClass} color="bg-yellow-100 text-yellow-800" />
                    )}
                  </div>
                  {herb.contraindications.map((c, i) => c.description ? (
                    <p key={i} className="mt-1 text-xs text-yellow-800">{c.description}</p>
                  ) : null)}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Acupoints */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-pink-700">
          🤰 {zh ? "孕婦禁針穴位" : "Acupoints — Contraindicated in Pregnancy"}
        </h2>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {acupoints.map((pt) => {
            const name = zh ? toTraditionalChinese(pt.chineseName, locale) : pt.pinyinName;
            return (
              <Link
                key={pt.id}
                href={`/acupuncture/${pt.id}`}
                className="flex items-center gap-2 rounded-lg border border-pink-200 bg-pink-50 p-2.5 text-sm hover:border-pink-400 transition-colors"
              >
                <span className="font-mono text-xs bg-pink-200 text-pink-900 px-1.5 py-0.5 rounded">
                  {pt.code}
                </span>
                <span className="font-medium">{name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="rounded-lg border border-border bg-surface p-4 text-xs text-muted">
        <strong>{zh ? "免責聲明：" : "Disclaimer: "}</strong>
        {zh
          ? "本資料基於傳統《中藥學》文獻整理，不構成醫療建議。孕婦用藥需由有執業資格的中醫師個別評估。"
          : "This data is compiled from traditional TCM literature and does not constitute medical advice. Pregnant patients must be individually assessed by a licensed TCM practitioner."}
      </div>
    </div>
  );
}
