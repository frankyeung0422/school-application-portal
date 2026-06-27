"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckInSparkline } from "@/components/health/CheckInSparkline";

type SymptomEntry = { name: string; severity: number };

type TimelineEvent =
  | { type: "check_in"; date: string; data: { overallScore: number; energyScore: number | null; painScore: number | null; sleepScore: number | null; notes: string | null } }
  | { type: "symptom_log"; date: string; data: { symptoms: string; energyLevel: number | null; notes: string | null } }
  | { type: "condition"; date: string; data: { westernName: string; status: string; tcmPatternFree: string | null } }
  | { type: "constitution"; date: string; data: { primary: string; secondary: string | null } };

const TYPE_CONFIG = {
  check_in: { icon: "📊", label: "Check-in", color: "border-l-green-400" },
  symptom_log: { icon: "📝", label: "Symptoms", color: "border-l-amber-400" },
  condition: { icon: "🩺", label: "Condition", color: "border-l-blue-400" },
  constitution: { icon: "🧬", label: "Constitution", color: "border-l-purple-400" },
};

function EventCard({ event }: { event: TimelineEvent }) {
  const config = TYPE_CONFIG[event.type];
  const date = new Date(event.date).toLocaleDateString("en-HK", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

  return (
    <div className={`rounded-xl border border-border bg-surface pl-4 pr-5 py-4 border-l-4 ${config.color}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 mb-1">
          <span>{config.icon}</span>
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">{config.label}</span>
        </div>
        <span className="text-xs text-muted shrink-0">{date}</span>
      </div>

      {event.type === "check_in" && (
        <div>
          <p className="text-sm font-medium">Overall score: <span className="text-primary font-bold">{event.data.overallScore}/10</span></p>
          <div className="flex gap-4 mt-1 flex-wrap">
            {event.data.energyScore !== null && <span className="text-xs text-muted">Energy {event.data.energyScore}/10</span>}
            {event.data.painScore !== null && <span className="text-xs text-muted">Pain {event.data.painScore}/10</span>}
            {event.data.sleepScore !== null && <span className="text-xs text-muted">Sleep {event.data.sleepScore}/10</span>}
          </div>
          {event.data.notes && <p className="text-xs text-muted mt-1">{event.data.notes}</p>}
        </div>
      )}

      {event.type === "symptom_log" && (() => {
        const symptoms: SymptomEntry[] = (() => { try { return JSON.parse(event.data.symptoms); } catch { return []; } })();
        return (
          <div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {symptoms.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs">
                  {s.name} <span className="text-primary font-semibold">{s.severity}/10</span>
                </span>
              ))}
            </div>
            {event.data.notes && <p className="text-xs text-muted mt-1">{event.data.notes}</p>}
          </div>
        );
      })()}

      {event.type === "condition" && (
        <div>
          <p className="text-sm font-medium">{event.data.westernName}</p>
          {event.data.tcmPatternFree && <p className="text-xs text-muted">TCM: {event.data.tcmPatternFree}</p>}
          <span className={`text-xs font-medium mt-1 inline-block ${event.data.status === "RESOLVED" ? "text-green-600" : event.data.status === "MANAGED" ? "text-amber-600" : "text-red-600"}`}>
            {event.data.status}
          </span>
        </div>
      )}

      {event.type === "constitution" && (
        <div>
          <p className="text-sm font-medium">Primary: <span className="text-primary">{event.data.primary}</span></p>
          {event.data.secondary && <p className="text-xs text-muted">Secondary: {event.data.secondary}</p>}
        </div>
      )}
    </div>
  );
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/health-profile/timeline")
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setLoading(false); });
  }, []);

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);

  // Build sparkline data from the last 12 check-in events (oldest first)
  const checkIns = [...events]
    .filter((e): e is Extract<typeof e, { type: "check_in" }> => e.type === "check_in")
    .slice(-12);

  const overallScores = checkIns.map(e => e.data.overallScore);
  const energyScores  = checkIns.map(e => e.data.energyScore ?? 0);
  const sleepScores   = checkIns.map(e => e.data.sleepScore ?? 0);
  const painScores    = checkIns.map(e => e.data.painScore ?? 0);
  const avgOverall    = overallScores.length
    ? Math.round((overallScores.reduce((s, v) => s + v, 0) / overallScores.length) * 10) / 10
    : null;

  const grouped = filtered.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
    const month = new Date(event.date).toLocaleDateString("en-HK", { year: "numeric", month: "long" });
    (acc[month] ??= []).push(event);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/my-health" className="text-sm text-muted hover:text-foreground">← My Health</Link>
          <h1 className="text-xl font-bold text-foreground mt-1">Health Timeline</h1>
        </div>
        <div className="flex gap-1">
          {[
            { key: "all", label: "All" },
            { key: "check_in", label: "Check-ins" },
            { key: "symptom_log", label: "Symptoms" },
            { key: "condition", label: "Conditions" },
            { key: "constitution", label: "Constitution" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filter === key ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sparkline trend section — shown when ≥2 check-ins exist */}
      {!loading && checkIns.length >= 2 && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Score Trends</h2>
            {avgOverall !== null && (
              <span className="text-xs text-muted">
                Last {checkIns.length} check-ins · Overall avg{" "}
                <span className="font-semibold text-primary">{avgOverall}/10</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-around gap-4">
            <CheckInSparkline values={overallScores} label="Overall" color="#0d9488" />
            <CheckInSparkline values={energyScores}  label="Energy"  color="#d97706" />
            <CheckInSparkline values={sleepScores}   label="Sleep"   color="#6366f1" />
            <CheckInSparkline
              values={painScores}
              label="Pain"
              color="#f43f5e"
              inverted
            />
          </div>
          <p className="text-xs text-muted mt-2 text-center">Pain chart is inverted — higher line = less pain</p>
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted">No health events recorded yet.</p>
          <p className="text-sm text-muted mt-1">Start with a check-in or log your symptoms.</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link href="/my-health/check-in" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
              Weekly Check-in
            </Link>
            <Link href="/my-health/symptoms" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
              Log Symptoms
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, monthEvents]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">{month}</h2>
              <div className="space-y-3">
                {monthEvents.map((event, i) => (
                  <EventCard key={i} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
