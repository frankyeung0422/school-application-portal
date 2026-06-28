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
  check_in: { icon: "📊", label: "評估", color: "border-l-green-400" },
  symptom_log: { icon: "📝", label: "症狀", color: "border-l-amber-400" },
  condition: { icon: "🩺", label: "病況", color: "border-l-blue-400" },
  constitution: { icon: "🧬", label: "體質", color: "border-l-purple-400" },
};

const STATUS_LABELS: Record<string, string> = {
  RESOLVED: "已康復",
  MANAGED: "受控",
  ACTIVE: "活躍",
};

const STATUS_COLORS: Record<string, string> = {
  RESOLVED: "text-green-600",
  MANAGED: "text-amber-600",
  ACTIVE: "text-red-600",
};

function EventCard({ event }: { event: TimelineEvent }) {
  const config = TYPE_CONFIG[event.type];
  const date = new Date(event.date).toLocaleDateString("zh-HK", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

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
          <p className="text-sm font-medium">整體評分：<span className="text-primary font-bold">{event.data.overallScore}/10</span></p>
          <div className="flex gap-4 mt-1 flex-wrap">
            {event.data.energyScore !== null && <span className="text-xs text-muted">精力 {event.data.energyScore}/10</span>}
            {event.data.painScore !== null && <span className="text-xs text-muted">疼痛 {event.data.painScore}/10</span>}
            {event.data.sleepScore !== null && <span className="text-xs text-muted">睡眠 {event.data.sleepScore}/10</span>}
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
          {event.data.tcmPatternFree && <p className="text-xs text-muted">中醫證型：{event.data.tcmPatternFree}</p>}
          <span className={`text-xs font-medium mt-1 inline-block ${STATUS_COLORS[event.data.status] ?? "text-muted"}`}>
            {STATUS_LABELS[event.data.status] ?? event.data.status}
          </span>
        </div>
      )}

      {event.type === "constitution" && (
        <div>
          <p className="text-sm font-medium">主型：<span className="text-primary">{event.data.primary}</span></p>
          {event.data.secondary && <p className="text-xs text-muted">次型：{event.data.secondary}</p>}
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
    const month = new Date(event.date).toLocaleDateString("zh-HK", { year: "numeric", month: "long" });
    (acc[month] ??= []).push(event);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/my-health" className="text-sm text-muted hover:text-foreground">← 我的健康</Link>
          <h1 className="text-xl font-bold text-foreground mt-1">健康時間軸</h1>
        </div>
        <div className="flex gap-1">
          {[
            { key: "all", label: "全部" },
            { key: "check_in", label: "評估" },
            { key: "symptom_log", label: "症狀" },
            { key: "condition", label: "病況" },
            { key: "constitution", label: "體質" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filter === key ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!loading && checkIns.length >= 2 && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">評分趨勢</h2>
            {avgOverall !== null && (
              <span className="text-xs text-muted">
                最近 {checkIns.length} 次評估 · 整體平均{" "}
                <span className="font-semibold text-primary">{avgOverall}/10</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-around gap-4">
            <CheckInSparkline values={overallScores} label="整體" color="#0d9488" />
            <CheckInSparkline values={energyScores}  label="精力" color="#d97706" />
            <CheckInSparkline values={sleepScores}   label="睡眠" color="#6366f1" />
            <CheckInSparkline
              values={painScores}
              label="疼痛"
              color="#f43f5e"
              inverted
            />
          </div>
          <p className="text-xs text-muted mt-2 text-center">疼痛圖表反轉顯示——線條越高代表疼痛越少</p>
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">載入中……</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted">尚未記錄任何健康事件。</p>
          <p className="text-sm text-muted mt-1">由健康評估或症狀記錄開始。</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link href="/my-health/check-in" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
              每週健康評估
            </Link>
            <Link href="/my-health/symptoms" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
              記錄症狀
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
