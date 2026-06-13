import { HerbForm } from "@/components/admin/HerbForm";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";

export default async function NewHerbPage() {
  const messages = getMessages(await getLocale());

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">{t(messages, "admin.addNewHerbTitle")}</h1>
      <HerbForm mode="create" />
    </div>
  );
}
