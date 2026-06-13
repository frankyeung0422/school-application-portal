import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export const metadata = { title: "Track Your Health Journey — EBTCM" };

export default async function ForPatientsPage() {
  const [herbCount, conditionCount, patternCount] = await Promise.all([
    prisma.herb.count(),
    prisma.conditionMapping.count(),
    prisma.tcmPattern.count(),
  ]);

  const features = [
    {
      icon: "📅",
      title: "Disease History Timeline",
      description: "Record your conditions, track onset and resolution dates, and see your full health story in a single chronological view.",
    },
    {
      icon: "📝",
      title: "Symptom Diary",
      description: "Log symptoms with severity scores, tongue observations, energy, sleep, and stress levels. Spot patterns over weeks and months.",
    },
    {
      icon: "📊",
      title: "Weekly Check-ins",
      description: "Rate six health domains (overall, energy, pain, sleep, stress, digestion) each week. Watch your trend lines improve.",
    },
    {
      icon: "🧬",
      title: "TCM Constitution",
      description: "Take the Wang Qi 9-constitution assessment and track how your constitution shifts over time with lifestyle and treatment.",
    },
    {
      icon: "📚",
      title: "Evidence-Based Guidance",
      description: `Explore ${herbCount}+ herbs, ${conditionCount}+ conditions mapped to TCM patterns, and evidence-backed food therapy recipes.`,
    },
    {
      icon: "🔬",
      title: "Contribute to Research",
      description: "Opt in to share your anonymised health data with verified TCM researchers — help build the evidence base for your own conditions.",
    },
  ];

  const steps = [
    { n: "1", title: "Create a free account", desc: 'Choose "Health Tracker" when signing up.' },
    { n: "2", title: "Add your conditions", desc: "Log current and past conditions with start dates and severity." },
    { n: "3", title: "Start your weekly check-in", desc: "Rate how you feel across six health domains." },
    { n: "4", title: "Explore TCM insights", desc: "Browse related patterns, food therapy, and evidence-based herbs for your conditions." },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-1.5 text-sm text-green-700 font-medium mb-6">
          🌿 Free for everyone
        </div>
        <h1 className="text-4xl font-bold text-foreground leading-tight mb-4">
          Track your health journey<br />with evidence-based TCM insights
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
          Log symptoms, track your disease history, and receive evidence-backed TCM guidance — all in one private, secure platform.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/register?role=PATIENT"
            className="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white hover:bg-primary-dark transition-colors shadow-sm">
            Start tracking for free
          </Link>
          <Link href="/login"
            className="rounded-xl border border-border bg-background px-8 py-3 text-base font-medium text-muted hover:text-foreground hover:border-primary transition-colors">
            Sign in
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-16">
        {[
          { value: `${herbCount}+`, label: "Herbs documented" },
          { value: `${conditionCount}+`, label: "Conditions mapped" },
          { value: `${patternCount}+`, label: "TCM patterns" },
        ].map(({ value, label }) => (
          <div key={label} className="text-center rounded-xl border border-border bg-surface p-6">
            <div className="text-3xl font-bold text-primary">{value}</div>
            <div className="text-sm text-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-8">Everything you need to understand your health</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon, title, description }) => (
            <div key={title} className="rounded-xl border border-border bg-surface p-5">
              <span className="text-3xl mb-3 block">{icon}</span>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-8">Get started in minutes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">{n}</div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-xl border border-border bg-surface p-6 text-center mb-12">
        <h2 className="font-semibold text-foreground mb-2">Your data, your choice</h2>
        <p className="text-sm text-muted max-w-lg mx-auto">
          Your health records are private by default. You can optionally opt in to share anonymised data with verified researchers — helping build the evidence base for TCM. You can change this anytime.
        </p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link href="/register?role=PATIENT"
          className="rounded-xl bg-primary px-10 py-4 text-base font-semibold text-white hover:bg-primary-dark transition-colors shadow-sm">
          Create your free health tracker account
        </Link>
        <p className="text-sm text-muted mt-3">Free forever · No credit card required</p>
      </div>
    </div>
  );
}
