import { auth } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

export const metadata = { title: "Researcher Dashboard — EBTCM" };

export default async function ResearcherDashboardPage() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!user?.id) redirect("/login?callbackUrl=/researcher");
  if (user.role !== "RESEARCHER" && user.role !== "ADMIN" && user.role !== "EDITOR") {
    redirect("/for-researchers");
  }

  const rp = await prisma.researcherProfile.findUnique({
    where: { userId: user.id },
    include: { _count: { select: { contributions: true, annotations: true } } },
  });

  const pendingContributions = rp
    ? await prisma.evidenceContribution.count({ where: { researcherProfileId: rp.id, status: "PENDING" } })
    : 0;

  const [totalEvidence, totalRWE, totalProfiles] = await Promise.all([
    prisma.evidenceEntry.count({ where: { status: "PUBLISHED" } }),
    prisma.consultation.count({ where: { symptomScoreBefore: { not: null } } }),
    prisma.researcherProfile.count(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Researcher Dashboard</h1>
        <p className="text-muted mt-1">Welcome, {user.name}. Access datasets, contribute evidence, and collaborate with peers.</p>
      </div>

      {!rp && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <span className="text-amber-500 text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Complete your researcher profile</p>
            <p className="text-xs text-amber-700 mt-0.5">Add your institution and ORCID to get verified and unlock full access.</p>
          </div>
          <Link href="/researcher/profile" className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
            Set up profile
          </Link>
        </div>
      )}

      {rp?.verificationStatus === "PENDING" && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Your researcher profile is pending verification. You can still contribute evidence and annotate entries — verification unlocks priority data access.
        </div>
      )}

      {/* Platform Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {[
          { label: "Evidence Entries", value: totalEvidence.toLocaleString(), icon: "📄" },
          { label: "RWE Consultations", value: totalRWE.toLocaleString(), icon: "🏥" },
          { label: "Active Researchers", value: totalProfiles.toLocaleString(), icon: "🔬" },
          { label: "My Contributions", value: (rp?._count.contributions ?? 0).toString(), icon: "✍️" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-bold text-primary">{value}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* Actions grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/researcher/export", icon: "📥", title: "Data Export", desc: "Download evidence, RWE outcomes, and network pharmacology data as CSV or JSON", badge: null },
          { href: "/researcher/contribute", icon: "✍️", title: "Submit Evidence", desc: "Contribute a new study or clinical observation for peer review", badge: pendingContributions > 0 ? `${pendingContributions} pending` : null },
          { href: "/researcher/profile", icon: "👤", title: "My Profile", desc: `${rp?.verificationStatus ?? "No profile"} · ${rp?._count.annotations ?? 0} annotations`, badge: rp?.verificationStatus === "VERIFIED" ? "✓ Verified" : null },
          { href: "/research/dashboard", icon: "📊", title: "Research Dashboard", desc: "Repurposing discovery, evidence maps, network pharmacology", badge: null },
          { href: "/research/rwe", icon: "🏥", title: "Real-World Evidence", desc: "Practitioner-reported outcomes aggregated by formula and pattern", badge: null },
          { href: "/evidence", icon: "📚", title: "Evidence Catalog", desc: "Browse and annotate 600+ GRADE-rated evidence entries", badge: null },
        ].map((card) => (
          <Link key={card.href} href={card.href}
            className="rounded-xl border border-border bg-surface p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              {card.badge && (
                <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-primary/10 text-primary">{card.badge}</span>
              )}
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{card.title}</h3>
            <p className="text-sm text-muted mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
