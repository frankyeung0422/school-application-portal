import { auth } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

export const metadata = { title: "My Health Dashboard — EBTCM" };

export default async function MyHealthPage() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!user?.id) redirect("/login?callbackUrl=/my-health");

  const profile = await prisma.userHealthProfile.findUnique({ where: { userId: user.id } });

  const [conditionCount, checkInCount, symptomCount, lastCheckIn] = await Promise.all([
    profile ? prisma.userConditionLog.count({ where: { profileId: profile.id, status: "ACTIVE" } }) : 0,
    profile ? prisma.healthCheckIn.count({ where: { profileId: profile.id } }) : 0,
    profile ? prisma.symptomLog.count({ where: { profileId: profile.id } }) : 0,
    profile ? prisma.healthCheckIn.findFirst({ where: { profileId: profile.id }, orderBy: { checkInDate: "desc" } }) : null,
  ]);

  const cards = [
    {
      href: "/my-health/conditions",
      icon: "🩺",
      title: "My Conditions",
      subtitle: `${conditionCount} active condition${conditionCount !== 1 ? "s" : ""}`,
      cta: conditionCount === 0 ? "Add your first condition" : "View & manage",
      color: "border-blue-200 bg-blue-50",
    },
    {
      href: "/my-health/symptoms",
      icon: "📝",
      title: "Symptom Diary",
      subtitle: `${symptomCount} log entr${symptomCount !== 1 ? "ies" : "y"}`,
      cta: "Log symptoms",
      color: "border-amber-200 bg-amber-50",
    },
    {
      href: "/my-health/check-in",
      icon: "📊",
      title: "Weekly Check-in",
      subtitle: lastCheckIn
        ? `Last: ${lastCheckIn.checkInDate.toLocaleDateString("en-HK")} · Score ${lastCheckIn.overallScore}/10`
        : "No check-ins yet",
      cta: "Start check-in",
      color: "border-green-200 bg-green-50",
    },
    {
      href: "/my-health/timeline",
      icon: "📅",
      title: "Health Timeline",
      subtitle: `${checkInCount} check-ins recorded`,
      cta: "View timeline",
      color: "border-purple-200 bg-purple-50",
    },
    {
      href: "/diagnose/constitution",
      icon: "🧬",
      title: "Constitution Assessment",
      subtitle: "Wang Qi 9-type TCM constitution",
      cta: "Take assessment",
      color: "border-rose-200 bg-rose-50",
    },
    {
      href: "/account/security",
      icon: "⚙️",
      title: "Profile & Privacy",
      subtitle: profile?.researchConsent ? "Contributing to research" : "Not contributing to research",
      cta: "Manage settings",
      color: "border-slate-200 bg-slate-50",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Health Dashboard</h1>
        <p className="text-muted mt-1">
          Welcome back, {user.name?.split(" ")[0] ?? "there"}. Track your health journey with evidence-based TCM insights.
        </p>
      </div>

      {!profile?.researchConsent && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <span className="text-green-600 text-xl">🔬</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Help advance TCM research</p>
            <p className="text-xs text-green-700 mt-0.5">
              Opt in to share your anonymised health data with researchers — your history helps validate TCM patterns and formulas.
            </p>
          </div>
          <Link
            href="/my-health/privacy"
            className="shrink-0 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
          >
            Learn more
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${card.color}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <h2 className="font-semibold text-foreground">{card.title}</h2>
            <p className="text-sm text-muted mt-1">{card.subtitle}</p>
            <p className="text-xs font-medium text-primary mt-3">{card.cta} →</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground mb-3">Explore TCM Knowledge</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/conditions", label: "Browse Conditions" },
            { href: "/patterns", label: "TCM Patterns" },
            { href: "/food-therapy", label: "Food Therapy" },
            { href: "/herbs", label: "Herb Database" },
            { href: "/interactions", label: "Safety Checker" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted hover:text-foreground hover:border-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
