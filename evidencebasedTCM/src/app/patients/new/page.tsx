import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext } from "@/lib/patients/access";
import { PatientForm } from "@/components/patients/PatientForm";

export const dynamic = "force-dynamic";

export default async function NewPatientPage() {
  const locale = await getLocale();
  const ctx = await getPractitionerContext();
  if (!ctx) redirect("/login?next=/patients/new");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">
        {locale === "zh-Hant" ? "新增病人" : "New Patient"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {locale === "zh-Hant"
          ? "建立病人基本資料，後續複診時可直接調閱與比較。"
          : "Create the patient's profile. Future visits can recall and compare against it."}
      </p>
      <PatientForm locale={locale} mode="create" />
    </div>
  );
}
