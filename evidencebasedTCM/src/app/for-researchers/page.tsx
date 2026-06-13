import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export const metadata = { title: "For Researchers & Clinicians — EBTCM" };

export default async function ForResearchersPage() {
  const [evidenceCount, herbCount, formulaCount, targetCount, trialCount, rwePaired] = await Promise.all([
    prisma.evidenceEntry.count({ where: { status: "PUBLISHED" } }),
    prisma.herb.count(),
    prisma.formula.count(),
    prisma.proteinTarget.count(),
    prisma.clinicalTrial.count(),
    prisma.consultation.count({ where: { symptomScoreBefore: { not: null }, symptomScoreAfter: { not: null } } }),
  ]);

  const datasets = [
    {
      icon: "📄",
      title: "GRADE-Rated Evidence Catalog",
      value: `${evidenceCount.toLocaleString()} entries`,
      description: "Systematic reviews, meta-analyses, and RCTs with CEBM levels, risk of bias, effect sizes, and DOI links.",
    },
    {
      icon: "🔬",
      title: "Network Pharmacology Graph",
      value: `${herbCount}+ herbs · ${targetCount.toLocaleString()} targets`,
      description: "Herb → active compound → protein target → KEGG pathway mapping with BindingDB affinity validation.",
    },
    {
      icon: "🏥",
      title: "Real-World Outcomes (RWE)",
      value: `${rwePaired.toLocaleString()} paired consultations`,
      description: "Practitioner-reported VAS before/after scores per formula and pattern, plus self-reported outcomes from consenting users.",
    },
    {
      icon: "🧪",
      title: "Clinical Trial Registry",
      value: `${trialCount.toLocaleString()} TCM trials`,
      description: "ClinicalTrials.gov records filtered for TCM interventions — phase, status, enrollment, lead sponsor.",
    },
    {
      icon: "💊",
      title: "Formula & Herb Database",
      value: `${formulaCount}+ formulas`,
      description: "Classical formulas with Jun/Chen/Zuo/Shi herb compositions, dosages, and evidence-based modifications.",
    },
    {
      icon: "📊",
      title: "Patient Self-Reports",
      value: "Growing pool",
      description: "Condition history, symptom diary, and check-in scores from consenting users — feeds directly into RWE.",
    },
  ];

  const researchTools = [
    { icon: "🔄", title: "Repurposing Discovery Board", desc: "Rank herb-disease pairs by network-pharmacology target overlap — surface novel candidates without existing clinical evidence.", href: "/research/discovery" },
    { icon: "🗺️", title: "Evidence Map", desc: "Visualise the evidence landscape for any condition across formulas, herbs, and acupuncture modalities.", href: "/research/evidence-map" },
    { icon: "⚗️", title: "AI Formula Architect", desc: "Generate mechanistically-grounded novel formula proposals for underserved diseases using network pharmacology.", href: "/research" },
    { icon: "✍️", title: "Evidence Contribution", desc: "Submit published studies for peer review. Accepted entries are added to the evidence catalog with your attribution.", href: "/researcher/contribute" },
    { icon: "💬", title: "Evidence Annotation", desc: "Add methodology notes, critiques, and clinical observations to any evidence entry — threaded, upvotable.", href: "/evidence" },
    { icon: "📥", title: "Data Export API", desc: "Download datasets as CSV or JSON for offline analysis — evidence, RWE, network pharmacology, and condition outcomes.", href: "/researcher/export" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm text-blue-700 font-medium mb-6">
          🔬 For researchers, clinicians & academics
        </div>
        <h1 className="text-4xl font-bold text-foreground leading-tight mb-4">
          The evidence layer for<br />Traditional Chinese Medicine research
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
          Access curated datasets, contribute evidence, annotate studies, and collaborate with a growing community of verified TCM researchers.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/register?role=RESEARCHER"
            className="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white hover:bg-primary-dark transition-colors shadow-sm">
            Apply for researcher access
          </Link>
          <Link href="/research/dashboard"
            className="rounded-xl border border-border bg-background px-8 py-3 text-base font-medium text-muted hover:text-foreground hover:border-primary transition-colors">
            Explore research tools
          </Link>
        </div>
      </div>

      {/* Datasets */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-2">Available datasets</h2>
        <p className="text-center text-muted mb-8">All datasets are exportable as CSV or JSON after researcher verification.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map(({ icon, title, value, description }) => (
            <div key={title} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{icon}</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">{value}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Research tools */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-8">Research tools</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {researchTools.map(({ icon, title, desc, href }) => (
            <Link key={href} href={href}
              className="rounded-xl border border-border bg-surface p-5 hover:shadow-md transition-shadow group flex items-start gap-4">
              <span className="text-2xl shrink-0">{icon}</span>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-sm text-muted mt-1">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Verification */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 mb-12">
        <h2 className="font-semibold text-blue-900 mb-2">Researcher verification</h2>
        <p className="text-sm text-blue-800 mb-4">
          Researcher accounts are verified by our editorial team within 2–3 business days. Provide your institution name and ORCID iD to speed up verification. Verified researchers gain full dataset access and priority support.
        </p>
        <div className="flex gap-3 flex-wrap">
          <div className="text-sm text-blue-700">✓ Institutional email recommended</div>
          <div className="text-sm text-blue-700">✓ ORCID iD accepted</div>
          <div className="text-sm text-blue-700">✓ Manual review within 72h</div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link href="/register?role=RESEARCHER"
          className="rounded-xl bg-primary px-10 py-4 text-base font-semibold text-white hover:bg-primary-dark transition-colors shadow-sm">
          Apply for researcher access
        </Link>
        <p className="text-sm text-muted mt-3">
          Already have an account?{" "}
          <Link href="/researcher" className="text-primary hover:underline">Go to your researcher hub</Link>
        </p>
      </div>
    </div>
  );
}
