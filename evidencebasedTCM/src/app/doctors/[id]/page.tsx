import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getSpecialtyByKey } from "@/lib/doctors/specialties";

export const dynamic = "force-dynamic";

const SITE = process.env.SITE_URL ?? "https://evidencebasedtcm.com";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RouteCtx): Promise<Metadata> {
  const { id } = await params;
  const d = await prisma.famousDoctor.findUnique({
    where: { id },
    select: { chineseName: true, englishName: true, honorificTitle: true, primarySpecialty: true, affiliation: true, bioZh: true, status: true },
  });
  if (!d || d.status !== "PUBLISHED") {
    return { title: "Doctor Not Found · EBTCM" };
  }
  const specialty = getSpecialtyByKey(d.primarySpecialty);
  const title = `${d.chineseName}${d.englishName ? ` (${d.englishName})` : ""} — ${d.honorificTitle} · EBTCM 名醫推薦`;
  const description = (d.bioZh ?? "").slice(0, 160).replace(/\s+/g, " ").trim();
  const ogImage = `${SITE}/api/og/doctor?id=${id}`; // optional: implement /api/og/doctor later
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/doctors/${id}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/doctors/${id}`,
      type: "profile",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    keywords: [
      d.chineseName,
      d.englishName ?? "",
      d.honorificTitle,
      d.affiliation ?? "",
      specialty?.zh ?? "",
      specialty?.en ?? "",
      "TCM doctor",
      "Chinese medicine master",
      "中醫師",
      "國醫大師",
    ].filter((s): s is string => Boolean(s)),
  };
}

interface Credential { year: number; type: string; institution: string; detail?: string; }
interface Publication { title: string; journal?: string; year?: number; }

const TIER_LABEL: Record<string, { zh: string; en: string; cls: string }> = {
  MASTER: { zh: "國醫大師", en: "Master", cls: "bg-amber-100 text-amber-900 border-amber-300" },
  EXPERT: { zh: "知名教授", en: "Expert", cls: "bg-purple-100 text-purple-900 border-purple-300" },
  SPECIALIST: { zh: "專科專家", en: "Specialist", cls: "bg-blue-100 text-blue-900 border-blue-300" },
  CERTIFIED: { zh: "認證執業者", en: "Certified", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
};

function parseJsonOr<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export default async function DoctorDetailPage({ params }: RouteCtx) {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const { id } = await params;

  const doctor = await prisma.famousDoctor.findUnique({
    where: { id },
    include: {
      successCases: {
        where: { status: "PUBLISHED" },
        orderBy: [{ featured: "desc" }, { publishedYear: "desc" }],
      },
    },
  });
  if (!doctor || doctor.status !== "PUBLISHED") notFound();

  const credentials = parseJsonOr<Credential[]>(doctor.credentialsJson, []);
  const publications = parseJsonOr<Publication[]>(doctor.publicationsJson, []);
  const specialty = getSpecialtyByKey(doctor.primarySpecialty);
  const tier = TIER_LABEL[doctor.tier];

  // JSON-LD structured data — schema.org Person for Google rich results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE}/doctors/${doctor.id}`,
    name: doctor.englishName ?? doctor.chineseName,
    alternateName: doctor.englishName ? doctor.chineseName : undefined,
    honorificPrefix: doctor.honorificTitle,
    description: (doctor.bioZh ?? "").slice(0, 500).replace(/\s+/g, " ").trim(),
    affiliation: doctor.affiliation ? {
      "@type": "Organization",
      name: doctor.affiliation,
    } : undefined,
    jobTitle: specialty ? specialty.en : "Traditional Chinese Medicine Practitioner",
    knowsLanguage: ["zh-Hant", "zh-Hans", "en"],
    knowsAbout: doctor.specialtyTags.length > 0
      ? doctor.specialtyTags.map((t) => getSpecialtyByKey(t)?.en).filter(Boolean)
      : [specialty?.en],
    url: `${SITE}/doctors/${doctor.id}`,
    sameAs: [],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-xs text-muted mb-3">
        <Link href="/doctors" className="hover:underline">← {T("名醫推薦目錄", "Doctors Directory")}</Link>
      </nav>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-bold">{doctor.chineseName}</h1>
              {doctor.englishName && (
                <span className="text-lg text-muted font-medium">{doctor.englishName}</span>
              )}
            </div>
            <p className="text-base font-semibold text-amber-700 dark:text-amber-400">
              🏛 {doctor.honorificTitle}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${tier.cls}`}>
            {isZh ? tier.zh : tier.en}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-muted">{T("機構：", "Affiliation: ")}</span>
            <span className="font-medium">{doctor.affiliation}</span>
          </div>
          <div>
            <span className="text-muted">{T("地區：", "Region: ")}</span>
            <span className="font-medium">{doctor.region}</span>
          </div>
          {doctor.yearsOfPractice && (
            <div>
              <span className="text-muted">{T("臨床年資：", "Years of practice: ")}</span>
              <span className="font-medium">{doctor.yearsOfPractice} {T("年", "years")}</span>
            </div>
          )}
          <div>
            <span className="text-muted">{T("主要專長：", "Primary specialty: ")}</span>
            <Link href={`/doctors?specialty=${doctor.primarySpecialty}`} className="font-medium text-primary hover:underline">
              {specialty?.icon} {isZh ? specialty?.zh : specialty?.en}
            </Link>
          </div>
        </div>

        {doctor.specialtyTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs text-muted">{T("跨專長標籤：", "Cross-specialty tags: ")}</span>
            {doctor.specialtyTags.map((t) => {
              const s = getSpecialtyByKey(t);
              if (!s) return null;
              return (
                <Link
                  key={t}
                  href={`/doctors?specialty=${t}`}
                  className="text-xs rounded-full bg-background border border-border px-2 py-0.5 hover:border-primary-light"
                >
                  {s.icon} {isZh ? s.zh : s.en}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bio */}
      <section className="mb-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold mb-3 border-l-4 border-primary pl-3">
          {T("生平與學術", "Biography")}
        </h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{doctor.bioZh}</p>
        {doctor.bioEn && !isZh && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap mt-3 text-muted">{doctor.bioEn}</p>
        )}
      </section>

      {/* Philosophy */}
      {doctor.philosophyZh && (
        <section className="mb-8 rounded-xl border-l-4 border-amber-400 bg-amber-50/40 dark:bg-amber-900/10 p-6">
          <h2 className="text-lg font-semibold mb-3">
            💡 {T("學術思想與治療哲學", "Treatment Philosophy")}
          </h2>
          <p className="text-sm leading-relaxed">{doctor.philosophyZh}</p>
        </section>
      )}

      {/* Signature formulas */}
      {doctor.signatureFormulas.length > 0 && (
        <section className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-3 border-l-4 border-emerald-500 pl-3">
            💊 {T("代表方劑", "Signature Formulas")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {doctor.signatureFormulas.map((f, i) => (
              <span key={i} className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 text-emerald-800 dark:text-emerald-300 px-3 py-1 text-sm">
                {f}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Credentials */}
      {credentials.length > 0 && (
        <section className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-3 border-l-4 border-purple-500 pl-3">
            🎓 {T("資歷與榮譽", "Credentials & Honors")}
          </h2>
          <ul className="space-y-2.5 text-sm">
            {credentials.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-muted font-mono shrink-0 w-12">{c.year}</span>
                <div>
                  <div className="font-medium">{c.type}</div>
                  <div className="text-xs text-muted">{c.institution}{c.detail && ` · ${c.detail}`}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Publications */}
      {publications.length > 0 && (
        <section className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-3 border-l-4 border-blue-500 pl-3">
            📚 {T("代表著作 / 文獻", "Key Publications")}
          </h2>
          <ul className="space-y-2 text-sm">
            {publications.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.title}</span>
                {p.journal && <span className="text-muted"> · {p.journal}</span>}
                {p.year && <span className="text-muted"> · {p.year}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Success cases */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">
          🩺 {T("成功案例 · ", "Success Cases · ")}{doctor.successCases.length}
        </h2>
        {doctor.successCases.length === 0 ? (
          <p className="text-sm text-muted">{T("尚未公開案例。", "No cases published yet.")}</p>
        ) : (
          <div className="space-y-4">
            {doctor.successCases.map((c) => (
              <article key={c.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold">{c.titleZh}</h3>
                  {c.featured && (
                    <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                      ⭐ {T("精選", "Featured")}
                    </span>
                  )}
                </div>
                {c.conditionZh && (
                  <p className="text-xs text-muted mb-3">
                    {T("病名：", "Condition: ")}<span className="font-medium">{c.conditionZh}</span>
                    {c.conditionEn && <span className="ml-1">({c.conditionEn})</span>}
                  </p>
                )}

                {c.patientSummary && (
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
                      {T("病人摘要", "Patient Summary")}
                    </div>
                    <p className="text-sm">{c.patientSummary}</p>
                  </div>
                )}

                {c.presentationZh && (
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
                      {T("臨床表現", "Presentation")}
                    </div>
                    <p className="text-sm leading-relaxed">{c.presentationZh}</p>
                  </div>
                )}

                {c.patternDx && (
                  <div className="mb-3 inline-block">
                    <span className="text-[10px] uppercase tracking-wider text-muted mr-2">
                      {T("辨證", "Pattern Dx")}:
                    </span>
                    <span className="rounded-full bg-primary/10 text-primary px-3 py-0.5 text-sm font-medium">
                      {c.patternDx}
                    </span>
                  </div>
                )}

                {c.treatmentZh && (
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
                      💊 {T("治法 + 處方", "Treatment + Rx")}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.treatmentZh}</p>
                  </div>
                )}

                {c.outcomeZh && (
                  <div className="mb-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-900/40 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                      ✅ {T("治療結果", "Outcome")}
                    </div>
                    <p className="text-sm leading-relaxed">{c.outcomeZh}</p>
                    {c.followUpMonths && (
                      <p className="text-xs text-muted mt-1">
                        {T("隨訪", "Follow-up")}: {c.followUpMonths} {T("個月", "months")}
                      </p>
                    )}
                  </div>
                )}

                {c.citationSource && (
                  <p className="text-[10px] text-muted italic mt-2">
                    📖 {T("引用：", "Citation: ")}{c.citationSource}
                    {c.publishedYear && ` (${c.publishedYear})`}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Editorial source */}
      {doctor.source && (
        <section className="mb-6 rounded-lg border border-border bg-background p-4 text-xs text-muted">
          <strong>📚 {T("編輯來源", "Editorial sources")}:</strong> {doctor.source}
        </section>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted text-center leading-relaxed">
        {T(
          "📌 本條目為公開資料編輯整理（學術期刊、官方傳記），非商業推薦或代言。臨床治療請諮詢您的中醫師。所有案例已去識別化，引用來源見各案例頁尾。",
          "📌 This entry is compiled from public sources (peer-reviewed journals, official biographies). Not a commercial endorsement. Consult your TCM practitioner for clinical care. All cases anonymized; citations at each case's footer.",
        )}
      </p>
    </div>
  );
}
