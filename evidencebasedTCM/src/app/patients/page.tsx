import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext, visiblePatientsWhere } from "@/lib/patients/access";

export const dynamic = "force-dynamic";

function age(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const diff = Date.now() - dob.getTime();
  const yrs = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return yrs >= 0 && yrs < 150 ? yrs : null;
}

export default async function PatientsListPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const ctx = await getPractitionerContext();
  if (!ctx) {
    redirect("/login?next=/patients");
  }

  const visibleWhere = await visiblePatientsWhere(ctx);
  const patients = await prisma.patient.findMany({
    where: { ...visibleWhere, archived: false },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      gender: true,
      dateOfBirth: true,
      contactPhone: true,
      chronicConditions: true,
      practitionerId: true,
      clinic: { select: { id: true, name: true } },
      updatedAt: true,
      _count: { select: { consultations: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{T("病人檔案", "Patient Records")}</h1>
          <p className="text-sm text-muted mt-1">
            {T(
              "您管理的病人。所有資料只有您本人可見。",
              "Patients under your care. Records are visible only to you.",
            )}
          </p>
        </div>
        <Link
          href="/patients/new"
          className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-light whitespace-nowrap"
        >
          + {T("新增病人", "New patient")}
        </Link>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center bg-surface">
          <p className="text-sm text-muted">
            {T("尚無病人檔案。點擊上方「新增病人」開始建立。", "No patients yet. Click \"New patient\" to add one.")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background text-xs text-muted">
              <tr>
                <th className="text-left px-4 py-2 font-medium">{T("姓名", "Name")}</th>
                <th className="text-left px-4 py-2 font-medium">{T("性別 / 年齡", "Gender / Age")}</th>
                <th className="text-left px-4 py-2 font-medium">{T("聯絡電話", "Phone")}</th>
                <th className="text-left px-4 py-2 font-medium">{T("慢性病史", "Chronic conditions")}</th>
                <th className="text-right px-4 py-2 font-medium">{T("診次", "Visits")}</th>
                <th className="text-right px-4 py-2 font-medium">{T("最近更新", "Updated")}</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const a = age(p.dateOfBirth);
                const genderLabel = ({
                  MALE: T("男", "M"),
                  FEMALE: T("女", "F"),
                  OTHER: T("其他", "Other"),
                  UNDISCLOSED: "—",
                } as const)[p.gender];
                return (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-background/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/patients/${p.id}`} className="font-medium text-primary hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {genderLabel}
                      {a !== null && <span className="ml-1">· {a}{T("歲", "y")}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{p.contactPhone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted text-xs truncate max-w-[16rem]" title={p.chronicConditions ?? ""}>
                      {p.chronicConditions ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">{p._count.consultations}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted">
                      {p.updatedAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
