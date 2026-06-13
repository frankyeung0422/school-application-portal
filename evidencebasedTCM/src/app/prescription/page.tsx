import { prisma } from "@/lib/db/prisma";
import { PrescriptionBuilder } from "@/components/clinical/PrescriptionBuilder";
import { getLocale } from "@/lib/i18n/locale-server";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";

export default async function PrescriptionPage() {
  const locale = await getLocale();

  const [herbs, acupoints] = await Promise.all([
    prisma.herb.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, pinyinName: true, chineseName: true, dosageRange: true, category: true },
      orderBy: { pinyinName: "asc" },
    }),
    prisma.acupuncturePoint.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, code: true, pinyinName: true, chineseName: true, meridian: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {locale === "zh-Hant" ? "處方建構器" : "Prescription Builder"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {locale === "zh-Hant"
          ? "組合中藥處方與針灸取穴，穴位自動於人體模型標註，可即時列印或匯出。"
          : "Build herbal and acupuncture prescriptions. Points are auto-plotted on the body map. Save, print, or export as PDF."}
      </p>
      <PrescriptionBuilder
        locale={locale}
        herbs={herbs.map((h) => ({
          id: h.id,
          name:
            locale === "zh-Hant" ? toTraditionalChinese(h.chineseName, locale) : h.pinyinName,
          chineseName: toTraditionalChinese(h.chineseName, locale),
          category: h.category,
          dosageRange: h.dosageRange,
        }))}
        acupoints={acupoints.map((p) => ({
          id: p.id,
          code: p.code,
          pinyinName: p.pinyinName,
          chineseName: toTraditionalChinese(p.chineseName, locale),
          meridian: p.meridian,
        }))}
      />
    </div>
  );
}
