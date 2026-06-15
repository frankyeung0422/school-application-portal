"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/types";

interface PostListing {
  sourceFile: string;
  title: string;
  week: number;
  day: string;
  source: "handwritten" | "generated";
  body: string;
  bodyExcerpt: string;
  firstComment: string | null;
  imageExists: boolean;
  imagePath: string | null;
  status: string;
  scheduledFor: string | null;
  fbPostId: string | null;
  fbPermalink: string | null;
  errorMessage: string | null;
}

interface ParseError {
  file: string;
  error: string;
}

const STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-yellow-100 text-yellow-700",
};

const DEFAULT_TIMES_HK: Record<string, string> = {
  mon: "09:00", tue: "17:00", wed: "20:00",
  thu: "19:30", fri: "12:30", sat: "10:00",
};

export function FBSchedulerClient({ locale }: { locale: Locale }) {
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const [posts, setPosts] = useState<PostListing[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pubmedRunning, setPubmedRunning] = useState(false);
  const [pubmedLogTail, setPubmedLogTail] = useState<string>("");
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | "all" | "generated">("all");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [scheduleAnchor, setScheduleAnchor] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/fb-scheduler");
    const j = await res.json();
    if (j.ok) {
      setPosts(j.posts as PostListing[]);
      setParseErrors((j.parseErrors as ParseError[]) ?? []);
      setConfigured(Boolean(j.fbConfigured));
    }
    setLoading(false);
  }

  async function generateDrafts(count: number) {
    setGenerating(true);
    setGenerateMsg(T(`生成中… (${count} 篇)`, `Generating… (${count})`));
    try {
      const res = await fetch("/api/admin/fb-scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", count }),
      });
      const j = await res.json() as {
        ok: boolean;
        generated?: Array<{ title: string; topicKind: string; rasterized: boolean; rasterError?: string }>;
        failures?: Array<{ stage: string; error: string }>;
      };
      if (j.ok && j.generated?.length) {
        const titles = j.generated.map((g) => `✅ ${g.title} (${g.topicKind}${g.rasterized ? "" : " · " + T("無海報", "no poster")})`).join("\n");
        const fails = (j.failures ?? []).map((f) => `❌ ${f.stage}: ${f.error}`).join("\n");
        setGenerateMsg(`${titles}${fails ? "\n" + fails : ""}`);
        await load();
      } else {
        const fails = (j.failures ?? []).map((f) => `❌ ${f.stage}: ${f.error}`).join("\n");
        setGenerateMsg(fails || T("生成失敗（無詳情）", "Generation failed (no details)"));
      }
    } catch (e) {
      setGenerateMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    void load();
    void refreshPubmedStatus();
  }, []);

  // While the PubMed import is running, poll every 8s for fresh log output.
  useEffect(() => {
    if (!pubmedRunning) return;
    const id = setInterval(() => {
      void refreshPubmedStatus();
    }, 8000);
    return () => clearInterval(id);
  }, [pubmedRunning]);

  async function refreshPubmedStatus() {
    try {
      const res = await fetch("/api/admin/fb-scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pubmed_status" }),
      });
      const j = await res.json() as { ok: boolean; running: boolean; evidenceCount: number; logTail: string };
      if (j.ok) {
        setPubmedRunning(Boolean(j.running));
        setEvidenceCount(j.evidenceCount);
        setPubmedLogTail(j.logTail ?? "");
      }
    } catch { /* ignore */ }
  }

  async function importPubmed(max: number) {
    setPubmedRunning(true);
    setPubmedLogTail(T("啟動中…", "Starting…"));
    try {
      const res = await fetch("/api/admin/fb-scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_pubmed", max }),
      });
      const j = await res.json() as { ok: boolean; message?: string; error?: string };
      if (!j.ok) {
        setPubmedRunning(false);
        setPubmedLogTail(`❌ ${j.error}${j.message ? " — " + j.message : ""}`);
      } else {
        setPubmedLogTail(j.message ?? T("已啟動", "Started"));
        // Kick off a status refresh shortly so the log tail appears quickly.
        setTimeout(() => { void refreshPubmedStatus(); }, 3000);
      }
    } catch (e) {
      setPubmedRunning(false);
      setPubmedLogTail(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function verify() {
    setVerifyMsg(T("驗證中…", "Verifying…"));
    const res = await fetch("/api/admin/fb-scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify" }),
    });
    const j = await res.json();
    if (j.ok) {
      setVerifyMsg(`✅ Page: ${j.pageName}`);
    } else {
      setVerifyMsg(`❌ ${j.error}${j.message ? " — " + j.message : ""}`);
    }
  }

  async function actOn(post: PostListing, kind: "schedule_one" | "publish_now") {
    setActiveAction(post.sourceFile);
    let scheduledFor: string | undefined;
    if (kind === "schedule_one") {
      const time = DEFAULT_TIMES_HK[post.day] ?? "09:00";
      // Build a HKT timestamp: scheduleAnchor + offset based on day, time HKT.
      // Simpler: just use scheduleAnchor + time, treat as local browser TZ.
      // Most HK users have browser TZ = HKT, so this is OK.
      scheduledFor = `${scheduleAnchor}T${time}:00`;
    }
    const res = await fetch("/api/admin/fb-scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: kind, sourceFile: post.sourceFile, scheduledFor }),
    });
    const j = await res.json();
    setActiveAction(null);
    if (j.ok) {
      alert(T("成功！", "Success!") + (j.fbPermalink ? ` ${j.fbPermalink}` : ""));
      await load();
    } else {
      alert(`❌ ${j.error}${j.message ? "\n" + j.message : ""}`);
    }
  }

  const visiblePosts =
    selectedWeek === "all"
      ? posts
      : selectedWeek === "generated"
        ? posts.filter((p) => p.source === "generated")
        : posts.filter((p) => p.week === selectedWeek);
  const generatedCount = posts.filter((p) => p.source === "generated").length;
  const totalByStatus = {
    DRAFT: posts.filter((p) => p.status === "DRAFT").length,
    SCHEDULED: posts.filter((p) => p.status === "SCHEDULED").length,
    PUBLISHED: posts.filter((p) => p.status === "PUBLISHED").length,
    FAILED: posts.filter((p) => p.status === "FAILED").length,
  };

  return (
    <div className="space-y-6">
      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <details className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs">
          <summary className="font-semibold text-red-700 cursor-pointer">
            ⚠ {T(`${parseErrors.length} 篇無法解析`, `${parseErrors.length} posts failed to parse`)}
          </summary>
          <ul className="mt-2 space-y-1 font-mono">
            {parseErrors.map((e, i) => (
              <li key={i} className="text-red-700">{e.file}: {e.error}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Config banner */}
      {!configured && (
        <div className="rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4">
          <h3 className="font-bold mb-2">
            ⚠ {T("Facebook 未設定", "Facebook not configured")}
          </h3>
          <p className="text-sm">
            {T(
              "請於 .env 設定 FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN。完整指南：",
              "Set FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN in .env. Full guide: ",
            )}
            <code className="text-xs bg-white px-1.5 py-0.5 rounded">marketing/cmarketplan/facebook-posts/SETUP-FB-AUTOMATION.md</code>
          </p>
        </div>
      )}

      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4">
        <button
          onClick={verify}
          disabled={!configured}
          className="rounded-md bg-primary text-white px-3 py-1.5 text-sm disabled:opacity-50"
        >
          🔍 {T("驗證 FB 連線", "Verify FB Connection")}
        </button>
        <button
          onClick={() => generateDrafts(1)}
          disabled={generating}
          className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
          title={T("從 KB 自動生成 1 篇貼文 + 海報", "Generate 1 post + poster from KB")}
        >
          ✨ {generating ? T("生成中…", "Generating…") : T("AI 生成 1 篇", "Generate 1")}
        </button>
        <button
          onClick={() => generateDrafts(3)}
          disabled={generating}
          className="rounded-md border border-emerald-600 text-emerald-700 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          ✨ {T("生成 3 篇", "Generate 3")}
        </button>
        <button
          onClick={() => importPubmed(20)}
          disabled={pubmedRunning}
          className="rounded-md bg-indigo-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
          title={T("從 PubMed 抓取最新 RCT/SR/MA，由 LLM 評級後存入資料庫", "Fetch latest RCT/SR/MA from PubMed, LLM-grade, store in DB")}
        >
          🔄 {pubmedRunning ? T("抓取中…", "Importing…") : T("PubMed 抓取 (20)", "Import PubMed (20)")}
        </button>
        {evidenceCount !== null && (
          <span className="text-xs text-muted">
            📚 {T("證據", "evidence")}: <span className="font-semibold text-foreground">{evidenceCount}</span>
          </span>
        )}
        {verifyMsg && <span className="text-sm">{verifyMsg}</span>}
        {generateMsg && (
          <pre className="text-xs whitespace-pre-wrap text-muted max-w-md mt-1 w-full">{generateMsg}</pre>
        )}
        {pubmedLogTail && (
          <details className="w-full mt-1" open={pubmedRunning}>
            <summary className="text-xs text-muted cursor-pointer">
              🔄 {T("PubMed 進度", "PubMed progress")} {pubmedRunning && <span className="text-indigo-600">({T("執行中", "running")})</span>}
            </summary>
            <pre className="text-xs whitespace-pre-wrap text-muted bg-background border border-border rounded p-2 mt-1 max-h-48 overflow-y-auto">{pubmedLogTail}</pre>
          </details>
        )}
        <span className="ml-auto text-xs text-muted">
          {T("狀態：", "Status: ")}
          <span className="font-medium text-gray-700">DRAFT {totalByStatus.DRAFT}</span> ·
          <span className="font-medium text-blue-700 ml-1">SCHEDULED {totalByStatus.SCHEDULED}</span> ·
          <span className="font-medium text-emerald-700 ml-1">PUBLISHED {totalByStatus.PUBLISHED}</span> ·
          <span className="font-medium text-red-700 ml-1">FAILED {totalByStatus.FAILED}</span>
        </span>
      </div>

      {/* Week filter + anchor date */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted">{T("篩選週", "Filter week")}:</span>
        <button onClick={() => setSelectedWeek("all")} className={`text-xs px-3 py-1 rounded-full border ${selectedWeek === "all" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
          {T("全部", "All")} ({posts.length})
        </button>
        {[1, 2, 3, 4].map((w) => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className={`text-xs px-3 py-1 rounded-full border ${selectedWeek === w ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
          >
            Week {w}
          </button>
        ))}
        <button
          onClick={() => setSelectedWeek("generated")}
          className={`text-xs px-3 py-1 rounded-full border ${selectedWeek === "generated" ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-border"}`}
        >
          ✨ {T("AI 生成", "AI-generated")} ({generatedCount})
        </button>
        <span className="ml-auto text-xs text-muted">{T("排程基準日（每天時段依星期）", "Schedule anchor (HKT)")}: </span>
        <input
          type="date"
          value={scheduleAnchor}
          onChange={(e) => setScheduleAnchor(e.target.value)}
          className="text-xs rounded border border-border bg-background px-2 py-1"
        />
      </div>

      {/* Posts list */}
      {loading ? (
        <p className="text-sm text-muted">{T("載入中…", "Loading…")}</p>
      ) : (
        <div className="space-y-3">
          {visiblePosts.map((p) => (
            <div key={p.sourceFile} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs uppercase tracking-wider text-muted font-mono">
                      {p.source === "generated" ? "GEN" : `W${p.week}`} · {p.day.toUpperCase()}
                    </span>
                    {p.source === "generated" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">✨ AI</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CLS[p.status] ?? STATUS_CLS.DRAFT}`}>
                      {p.status}
                    </span>
                    {p.imageExists ? (
                      <span className="text-xs text-emerald-700">🖼 {T("海報已渲染", "image ready")}</span>
                    ) : (
                      <span className="text-xs text-yellow-700">⚠ {T("無海報 PNG", "no image PNG")}</span>
                    )}
                  </div>
                  <h3 className="font-semibold mb-1 truncate">{p.title}</h3>
                  <p className="text-xs text-muted line-clamp-2">{p.bodyExcerpt}</p>
                  {p.scheduledFor && (
                    <p className="text-xs text-blue-700 mt-1">
                      📅 {T("排程於", "Scheduled for")}: {new Date(p.scheduledFor).toLocaleString()}
                    </p>
                  )}
                  {p.fbPermalink && (
                    <p className="text-xs text-emerald-700 mt-1">
                      🔗 <a href={p.fbPermalink} target="_blank" rel="noopener noreferrer" className="underline">{p.fbPermalink}</a>
                    </p>
                  )}
                  {p.errorMessage && (
                    <p className="text-xs text-red-700 mt-1">❌ {p.errorMessage}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => actOn(p, "schedule_one")}
                    disabled={!configured || activeAction === p.sourceFile || ["SCHEDULED", "PUBLISHED"].includes(p.status)}
                    className="text-xs rounded bg-blue-600 text-white px-3 py-1 disabled:opacity-40"
                  >
                    {activeAction === p.sourceFile ? "…" : T("排程", "Schedule")}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(T("確定立即發布？此動作不可逆。", "Publish now? This is immediate."))) {
                        void actOn(p, "publish_now");
                      }
                    }}
                    disabled={!configured || activeAction === p.sourceFile || p.status === "PUBLISHED"}
                    className="text-xs rounded border border-border bg-background px-3 py-1 disabled:opacity-40"
                  >
                    {T("立即發", "Post Now")}
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted font-mono mt-2">{p.sourceFile}</div>
            </div>
          ))}
          {visiblePosts.length === 0 && (
            <p className="text-sm text-muted">{T("無貼文。", "No posts.")}</p>
          )}
        </div>
      )}

      {/* Help footer */}
      <div className="rounded-lg border border-border bg-surface p-4 text-xs text-muted">
        <p className="mb-1"><strong>{T("快速指南", "Quick guide")}:</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>{T("先渲染海報：", "Render posters: ")}<code>npx tsx scripts/render-svg-to-png.ts</code></li>
          <li>{T("驗證 FB 連線（左上按鈕）", "Verify FB connection (button above)")}</li>
          <li>{T("選擇排程基準日，依星期自動配對時段", "Pick anchor date — each day auto-uses its preferred HKT time")}</li>
          <li>{T("點「排程」按鈕逐篇排程，或", "Click Schedule per post, OR ")}<code>npx tsx scripts/post-fb.ts --batch=week-1 --apply --start=YYYY-MM-DD</code></li>
        </ol>
      </div>
    </div>
  );
}
