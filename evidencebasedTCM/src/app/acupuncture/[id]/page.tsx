import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { DetailTabs } from "@/components/shared/DetailTabs";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Badge } from "@/components/shared/Badge";
import { AcupointLocator } from "@/components/acupuncture/AcupointLocator";
import { MeridianBadge } from "@/components/shared/MeridianBadge";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { localizeDbText } from "@/lib/i18n/to-traditional";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";
import { studyTypeLabel, evidenceLevelLabel, pathologyLabel, meridianLabel } from "@/lib/i18n/data-labels";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AcupointDetailPage({ params }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const { id } = await params;

  const [acupoint, allPointsForMap] = await Promise.all([
    prisma.acupuncturePoint.findUnique({
      where: { id },
      include: {
        patternAcupoints: {
          include: {
            pattern: {
              select: { id: true, pinyinName: true, chineseName: true, pathologyType: true },
            },
          },
        },
        evidenceLinks: {
          include: { evidence: true },
        },
      },
    }),
    prisma.acupuncturePoint.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, code: true, pinyinName: true, chineseName: true, meridian: true },
      orderBy: { code: "asc" },
    }),
  ]);

  if (!acupoint) notFound();

  const chineseTc = toTraditionalChinese(acupoint.chineseName, locale);
  const titlePrimary = locale === "zh-Hant" ? chineseTc : acupoint.pinyinName;
  const titleSecondary = locale === "zh-Hant" ? acupoint.pinyinName : chineseTc;
  const breadcrumbTitle = `${acupoint.code} ${titlePrimary}`;

  const zh = locale === "zh-Hant";

  const FUNC_CAT_LABEL: Record<string, string> = {
    "Jing-Well": zh ? "井穴" : "Jing-Well",
    "Ying-Spring": zh ? "滎穴" : "Ying-Spring",
    "Shu-Stream": zh ? "輸穴" : "Shu-Stream",
    "Jing-River": zh ? "經穴" : "Jing-River",
    "He-Sea": zh ? "合穴" : "He-Sea",
    "Yuan-Source": zh ? "原穴" : "Yuan-Source",
    "Luo-Connecting": zh ? "絡穴" : "Luo-Connecting",
    "Xi-Cleft": zh ? "郄穴" : "Xi-Cleft",
    "Back-Shu": zh ? "背俞穴" : "Back-Shu",
    "Front-Mu": zh ? "募穴" : "Front-Mu",
    "Confluent": zh ? "八脈交會穴" : "Confluent (8 Extra Vessels)",
    "Hui-Meeting": zh ? "八會穴" : "Hui-Meeting",
    "Command": zh ? "四總穴" : "Command",
    "Four-Command": zh ? "四總穴" : "Four-Command",
    "Lower-He-Sea": zh ? "下合穴" : "Lower He-Sea",
    "Ghost-Point": zh ? "十三鬼穴" : "Ghost Point",
    "Window-of-Heaven": zh ? "天窗穴" : "Window of Heaven",
    "Three-Yin-Intersection": zh ? "三陰交" : "Three Yin Intersection",
    "Sea-of-Blood": zh ? "血海" : "Sea of Blood",
    "Major-Luo": zh ? "大絡" : "Major Luo",
    "Hundred-Convergences": zh ? "百會" : "Hundred Convergences",
    "Gate-of-Life": zh ? "命門" : "Gate of Life",
    "Sea-of-Yang": zh ? "陽脈之海" : "Sea of Yang",
    "Three-Yang-Intersection": zh ? "三陽交會" : "Three Yang Intersection",
    "Sea-of-Qi": zh ? "氣海" : "Sea of Qi",
    "Life-Gate-Navel": zh ? "神闕（禁針）" : "Life-Gate Navel (no needle)",
    "Dai-Mai": zh ? "帶脈" : "Dai Mai",
  };

  const overviewTab = (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            {t(messages, "detail.acupoint.meridian")}
          </h4>
          <p className="font-medium">{meridianLabel(locale, acupoint.meridian)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            {t(messages, "detail.acupoint.whoCode")}
          </h4>
          <p className="font-mono font-medium">{acupoint.code}</p>
        </div>
        {acupoint.depth && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t(messages, "detail.acupoint.needlingDepth")}
            </h4>
            <p className="font-medium">{localizeDbText(acupoint.depth, locale)}</p>
          </div>
        )}
        {acupoint.needleAngle && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {zh ? "進針角度" : "Needle Angle"}
            </h4>
            <p className="font-medium text-sm">{acupoint.needleAngle}</p>
          </div>
        )}
      </div>

      {/* Moxa / Pregnancy safety badges */}
      {(acupoint.moxaApplicable !== null || acupoint.pregnancyContraindicated !== null || (acupoint.functionalCategories ?? []).length > 0) && (
        <div className="flex flex-wrap gap-2">
          {acupoint.moxaApplicable === true && !acupoint.moxaContraindicated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              🔥 {zh ? "可灸" : "Moxa OK"}
            </span>
          )}
          {acupoint.moxaContraindicated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
              🚫 {zh ? "禁灸" : "No Moxa"}
            </span>
          )}
          {acupoint.pregnancyContraindicated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-pink-300 bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">
              🤰 {zh ? "孕婦禁針" : "Pregnancy CI"}
            </span>
          )}
          {(acupoint.functionalCategories ?? []).map((cat) => (
            <span key={cat} className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
              {FUNC_CAT_LABEL[cat] ?? cat}
            </span>
          ))}
        </div>
      )}

      {acupoint.location && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.acupoint.location")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(acupoint.location, locale)}
          </p>
        </div>
      )}

      {acupoint.actions && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.acupoint.actions")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(acupoint.actions, locale)}
          </p>
        </div>
      )}

      {acupoint.indications && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.acupoint.indications")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(acupoint.indications, locale)}
          </p>
        </div>
      )}

      {acupoint.contraindications && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.acupoint.contraindications")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(acupoint.contraindications, locale)}
          </p>
        </div>
      )}

      {acupoint.patternAcupoints.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.acupoint.relatedPatterns")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {acupoint.patternAcupoints.map((pa) => {
              const pZh = toTraditionalChinese(pa.pattern.chineseName, locale);
              const pPrimary = locale === "zh-Hant" ? pZh : pa.pattern.pinyinName;
              const pSecondary = locale === "zh-Hant" ? pa.pattern.pinyinName : pZh;
              return (
                <Link
                  key={pa.id}
                  href={`/patterns/${pa.pattern.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                >
                  <div>
                    <span className="font-medium">{pPrimary}</span>
                    <span className="text-sm text-muted ml-2">{pSecondary}</span>
                  </div>
                  <Badge label={pathologyLabel(locale, pa.pattern.pathologyType)} />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const evidenceTab = (
    <div className="space-y-4">
      {acupoint.evidenceLinks.length === 0 ? (
        <p className="text-sm text-muted">{t(messages, "detail.acupoint.noEvidence")}</p>
      ) : (
        acupoint.evidenceLinks.map((link) => (
          <Link
            key={link.id}
            href={`/evidence/${link.evidence.id}`}
            className="block rounded-lg border border-border p-4 hover:border-primary-light transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{localizeDbText(link.evidence.title, locale)}</h4>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                  <span>{studyTypeLabel(locale, link.evidence.studyType)}</span>
                  {link.evidence.year && <span>({link.evidence.year})</span>}
                  {link.evidence.journal && (
                    <span>
                      {t(messages, "common.dash")} {localizeDbText(link.evidence.journal, locale)}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {evidenceLevelLabel(locale, link.evidence.evidenceLevel)}
                </div>
              </div>
              <EvidenceBadge grade={link.evidence.evidenceGrade as "A" | "B" | "C" | "D"} locale={locale} />
            </div>
            {link.evidence.summary && (
              <p className="mt-2 text-sm text-muted line-clamp-2">
                {localizeDbText(link.evidence.summary, locale)}
              </p>
            )}
          </Link>
        ))
      )}
    </div>
  );

  const locatorTab = (
    <AcupointLocator
      point={{
        id: acupoint.id,
        code: acupoint.code,
        pinyinName: acupoint.pinyinName,
        chineseName: toTraditionalChinese(acupoint.chineseName, locale),
        meridian: acupoint.meridian,
      }}
      allPoints={allPointsForMap.map((p) => ({
        id: p.id,
        code: p.code,
        pinyinName: p.pinyinName,
        chineseName: toTraditionalChinese(p.chineseName, locale),
        meridian: p.meridian,
      }))}
      locale={locale}
      labels={{
        front: t(messages, "acupuncture.mapFront"),
        back: t(messages, "acupuncture.mapBack"),
        allMeridians: t(messages, "acupuncture.mapAllMeridians"),
        clickHint: t(messages, "acupuncture.mapClickHint"),
        noMapping: t(messages, "acupuncture.mapNoMapping"),
        overview: t(messages, "detail.acupoint.locatorOverview"),
        zoomedView: t(messages, "detail.acupoint.locatorZoomed"),
        needleDiagram: t(messages, "detail.acupoint.locatorNeedle"),
        cunRuler: t(messages, "detail.acupoint.locatorCun"),
        angle: t(messages, "detail.acupoint.locatorAngle"),
        depth: t(messages, "detail.acupoint.locatorDepth"),
        perpendicular: t(messages, "detail.acupoint.locatorPerpendicular"),
        oblique: t(messages, "detail.acupoint.locatorOblique"),
        transverse: t(messages, "detail.acupoint.locatorTransverse"),
        landmark: t(messages, "detail.acupoint.locatorLandmark"),
        skinLayer: t(messages, "detail.acupoint.locatorSkin"),
        subcutaneous: t(messages, "detail.acupoint.locatorSubcutaneous"),
        muscle: t(messages, "detail.acupoint.locatorMuscle"),
        cunHint: t(messages, "detail.acupoint.locatorCunHint"),
        cunLandmarkTitle: t(messages, "detail.acupoint.locatorCunLandmarks"),
        cunLandmarks:
          locale === "zh-Hant"
            ? [
                ["前髮際正中至後髮際正中", "12 寸"],
                ["兩額角髮際之間", "9 寸"],
                ["兩乳頭之間", "8 寸"],
                ["胸骨下端至臍中", "8 寸"],
                ["臍中至恥骨聯合上緣", "5 寸"],
                ["腋前紋頭至肘橫紋", "9 寸"],
                ["肘橫紋至腕橫紋", "12 寸"],
                ["恥骨聯合上緣至股骨內上髁", "18 寸"],
                ["膕橫紋至外踝尖", "16 寸"],
                ["拇指指間關節橫寬", "1 寸"],
                ["食、中、環、小四指併攏橫寬", "3 寸"],
              ]
            : [
                ["Anterior to posterior hairline", "12 cun"],
                ["Between two frontal hairlines", "9 cun"],
                ["Between the two nipples", "8 cun"],
                ["Xiphoid to umbilicus", "8 cun"],
                ["Umbilicus to pubic symphysis", "5 cun"],
                ["Anterior axillary fold to elbow crease", "9 cun"],
                ["Elbow crease to wrist crease", "12 cun"],
                ["Pubic symphysis to medial epicondyle of femur", "18 cun"],
                ["Popliteal crease to lateral malleolus", "16 cun"],
                ["Width of thumb IP joint", "1 cun"],
                ["Width of 4 fingers together", "3 cun"],
              ],
      }}
    />
  );

  const tabs = [
    { id: "overview", label: t(messages, "detail.tabOverview"), content: overviewTab },
    {
      id: "locator",
      label: t(messages, "detail.acupoint.tabLocator"),
      content: locatorTab,
    },
    {
      id: "evidence",
      label: tf(messages, "detail.tabEvidenceCount", { count: acupoint.evidenceLinks.length }),
      content: evidenceTab,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/acupuncture" className="hover:text-primary">
          {t(messages, "nav.acupuncture")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{breadcrumbTitle}</span>
      </nav>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded">{acupoint.code}</span>
          <h1 className="text-3xl font-bold">{titlePrimary}</h1>
        </div>
        <p className="text-lg text-muted mt-1">{titleSecondary}</p>
        {acupoint.englishName && <p className="text-sm text-muted">{acupoint.englishName}</p>}
        <div className="mt-2">
          <MeridianBadge meridian={acupoint.meridian} locale={locale} size="md" />
        </div>
      </div>

      <DetailTabs tabs={tabs} />
    </div>
  );
}
