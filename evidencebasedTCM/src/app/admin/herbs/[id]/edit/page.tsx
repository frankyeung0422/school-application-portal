import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { HerbForm } from "@/components/admin/HerbForm";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { tf } from "@/lib/i18n/format-message";
import { localizeDbText } from "@/lib/i18n/to-traditional";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditHerbPage({ params }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const { id } = await params;
  const herb = await prisma.herb.findUnique({ where: { id } });
  if (!herb) notFound();

  const chinese = localizeDbText(herb.chineseName, locale) ?? herb.chineseName;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {tf(messages, "admin.editHerbTitle", { pinyin: herb.pinyinName, chinese })}
      </h1>
      <HerbForm
        mode="edit"
        initialData={{
          id: herb.id,
          pinyinName: herb.pinyinName,
          chineseName: herb.chineseName,
          latinName: herb.latinName || "",
          englishName: herb.englishName || "",
          category: herb.category,
          nature: herb.nature,
          flavor: herb.flavor,
          meridianTropism: herb.meridianTropism,
          dosageRange: herb.dosageRange || "",
          description: herb.description || "",
          modernPharmacology: herb.modernPharmacology || "",
          status: herb.status,
        }}
      />
    </div>
  );
}
