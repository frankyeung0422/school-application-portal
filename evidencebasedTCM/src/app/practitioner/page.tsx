import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { auth } from "@/lib/auth/authOptions";

export const dynamic = "force-dynamic";

export default async function PractitionerDashboard() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const session = await auth();

  // Aggregate platform-wide stats for at-a-glance reference
  const [
    herbCount, formulaCount, acupointCount, patternCount, conditionCount,
    evidenceCount, gradeACount, hdiCount,
  ] = await Promise.all([
    prisma.herb.count(),
    prisma.formula.count(),
    prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(),
    prisma.conditionMapping.count(),
    prisma.evidenceEntry.count(),
    prisma.evidenceEntry.count({ where: { evidenceGrade: "A" } }),
    prisma.herbDrugInteraction.count(),
  ]);

  // Personal recent activity (bookmarks if logged in)
  const userId = session?.user?.id;
  const recentBookmarks = userId
    ? await prisma.bookmark.findMany({
        where: { userId },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { id: true, entityType: true, entityId: true, createdAt: true },
      })
    : [];

  // Resolve bookmark entity names via batch lookups
  const bkHerbIds     = recentBookmarks.filter(b => b.entityType === "HERB").map(b => b.entityId);
  const bkFormulaIds  = recentBookmarks.filter(b => b.entityType === "FORMULA").map(b => b.entityId);
  const bkAcuIds      = recentBookmarks.filter(b => b.entityType === "ACUPOINT").map(b => b.entityId);
  const bkPatternIds  = recentBookmarks.filter(b => b.entityType === "PATTERN").map(b => b.entityId);
  const bkEvidenceIds = recentBookmarks.filter(b => b.entityType === "EVIDENCE").map(b => b.entityId);
  const bkCondIds     = recentBookmarks.filter(b => b.entityType === "CONDITION").map(b => b.entityId);

  const [bkHerbs, bkFormulas, bkAcupoints, bkPatterns, bkEvidence, bkConditions] = await Promise.all([
    bkHerbIds.length     ? prisma.herb.findMany({ where: { id: { in: bkHerbIds } }, select: { id: true, pinyinName: true, chineseName: true } }) : [],
    bkFormulaIds.length  ? prisma.formula.findMany({ where: { id: { in: bkFormulaIds } }, select: { id: true, pinyinName: true, chineseName: true } }) : [],
    bkAcuIds.length      ? prisma.acupuncturePoint.findMany({ where: { id: { in: bkAcuIds } }, select: { id: true, code: true, pinyinName: true, chineseName: true } }) : [],
    bkPatternIds.length  ? prisma.tcmPattern.findMany({ where: { id: { in: bkPatternIds } }, select: { id: true, pinyinName: true, chineseName: true } }) : [],
    bkEvidenceIds.length ? prisma.evidenceEntry.findMany({ where: { id: { in: bkEvidenceIds } }, select: { id: true, title: true } }) : [],
    bkCondIds.length     ? prisma.conditionMapping.findMany({ where: { id: { in: bkCondIds } }, select: { id: true, westernName: true } }) : [],
  ]);

  const bkNameMap = new Map<string, string>();
  bkHerbs.forEach(h    => bkNameMap.set(h.id, `${h.pinyinName} ${h.chineseName}`));
  bkFormulas.forEach(f => bkNameMap.set(f.id, `${f.pinyinName} ${f.chineseName}`));
  bkAcupoints.forEach(a => bkNameMap.set(a.id, `${a.code} ${a.pinyinName}`));
  bkPatterns.forEach(p => bkNameMap.set(p.id, `${p.pinyinName} ${p.chineseName}`));
  bkEvidence.forEach(e => bkNameMap.set(e.id, e.title));
  bkConditions.forEach(c => bkNameMap.set(c.id, c.westernName));

  const bkHrefBase: Record<string, string> = {
    HERB: "/herbs",
    FORMULA: "/formulas",
    ACUPOINT: "/acupuncture",
    PATTERN: "/patterns",
    EVIDENCE: "/evidence",
    CONDITION: "/conditions",
  };
  const bkTypeLabel: Record<string, string> = {
    HERB: "Herb", FORMULA: "Formula", ACUPOINT: "Acupoint",
    PATTERN: "Pattern", EVIDENCE: "Evidence", CONDITION: "Condition",
  };
  const bkTypeLabelZh: Record<string, string> = {
    HERB: "藥材", FORMULA: "方劑", ACUPOINT: "穴位",
    PATTERN: "證型", EVIDENCE: "研究", CONDITION: "病症",
  };

  const userName = session?.user?.name ?? T("醫師", "Doctor");

  // Recent high-impact evidence (week's reading)
  const recentEvidence = await prisma.evidenceEntry.findMany({
    where: { evidenceGrade: { in: ["A", "B"] } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, journal: true, year: true, evidenceGrade: true, studyType: true },
  });

  // Daily clinical shortcuts
  const shortcuts = [
    {
      href: "/diagnose/symptoms",
      icon: "🩺",
      title: T("症狀 → 證型", "Symptom → Pattern"),
      body: T("輸入主訴與舌脈，AI 推薦候選證型與處方", "Enter chief complaint + tongue/pulse → AI suggests candidate patterns + formulas"),
    },
    {
      href: "/diagnose/prescription",
      icon: "📸",
      title: T("處方拍照辨識", "Prescription Photo Analysis"),
      body: T("拍攝任何中藥處方 → AI 解析組成、適應症、配伍警示", "Photo any TCM prescription → AI parses composition, uses, conflicts"),
      badge: T("Pro 功能", "Pro feature"),
    },
    {
      href: "/prescription",
      icon: "📋",
      title: T("處方建構器", "Prescription Builder"),
      body: T("拖曳藥物組方，自動劑量、配伍檢查、PDF 列印", "Drag-build formulas, auto-dose, compatibility check, PDF print"),
      badge: T("Pro 功能", "Pro feature"),
    },
    {
      href: "/safety/check",
      icon: "🛡",
      title: T("用藥安全檢查", "Safety Check"),
      body: T("中藥-西藥交互、孕婦禁忌、肝腎風險即時查詢", "Herb-drug interactions, pregnancy contraindications, hepatic/renal risks"),
    },
    {
      href: "/interactions",
      icon: "⚠",
      title: T("藥物交互查詢", "Interactions"),
      body: T(`${hdiCount} 條中藥-西藥交互、十八反十九畏、現代藥理`, `${hdiCount} herb-drug interactions, classical incompatibilities, modern pharma`),
    },
    {
      href: "/research",
      icon: "📚",
      title: T("研究文獻庫", "Research Library"),
      body: T(`${evidenceCount} 條 GRADE 評級研究（${gradeACount} 篇 A 級）`, `${evidenceCount} GRADE-rated studies (${gradeACount} Grade A)`),
    },
    {
      href: "/patients",
      icon: "📋",
      title: T("病人檔案", "Patient Records"),
      body: T("四診紀錄、處方、療效追蹤、舌相、自動配伍警示、PDF 列印", "Four-exam notes, prescriptions, outcome tracking, tongue photos, auto interaction-check, PDF print"),
      badge: T("Pro 功能", "Pro feature"),
    },
    {
      href: "/cases",
      icon: "📁",
      title: T("病例管理", "Patient Cases"),
      body: T("記錄患者處方、追蹤療效、輸出 SOAP 報告", "Patient prescriptions, outcome tracking, SOAP exports"),
      badge: T("Pro 功能", "Pro feature"),
    },
    {
      href: "/learn",
      icon: "🎓",
      title: T("名師講堂", "Master Courses"),
      body: T("傷寒論、金匱要略、診斷學等 8 門經典課程", "Shang Han Lun, Jin Gui Yao Lue, Diagnostics — 8 classical courses"),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Welcome bar */}
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {T(`您好，${userName}`, `Welcome, ${userName}`)}
          </h1>
          <p className="text-sm text-muted mt-1">
            {T(
              `今日 ${new Date().toLocaleDateString(locale === "zh-Hant" ? "zh-TW" : "en-US")} · 為您的臨床決策準備好了`,
              `${new Date().toLocaleDateString("en-US")} · Ready for today's clinical decisions`,
            )}
          </p>
        </div>
        {!session && (
          <Link
            href="/login"
            className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-primary-light"
          >
            {T("登入以解鎖個人化功能", "Sign in to unlock personalized features")}
          </Link>
        )}
      </div>

      {/* Platform stats strip */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: T("中藥", "Herbs"), value: herbCount },
          { label: T("方劑", "Formulas"), value: formulaCount },
          { label: T("穴位", "Acupoints"), value: acupointCount },
          { label: T("證型", "Patterns"), value: patternCount },
          { label: T("病症", "Conditions"), value: conditionCount },
          { label: T("研究證據", "Evidence"), value: evidenceCount },
          { label: T("A 級研究", "Grade A"), value: gradeACount, accent: true },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-lg border p-3 ${
              s.accent
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-surface"
            }`}
          >
            <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
            <div className="text-xs text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Daily clinical shortcuts grid */}
      <h2 className="text-xl font-semibold mb-4">
        {T("🩺 臨床快捷工具", "🩺 Clinical Shortcuts")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-border bg-surface p-5 hover:border-primary-light hover:shadow-md transition-all relative"
          >
            {s.badge && (
              <span className="absolute top-3 right-3 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                {s.badge}
              </span>
            )}
            <div className="text-3xl mb-2">{s.icon}</div>
            <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{s.title}</h3>
            <p className="text-xs text-muted leading-relaxed">{s.body}</p>
          </Link>
        ))}
      </div>

      {/* Two-column: recent bookmarks + this week's evidence */}
      <div className="grid gap-6 lg:grid-cols-2 mb-10">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">{T("📌 最近收藏", "📌 Recent Bookmarks")}</h2>
            <Link href="/bookmarks" className="text-xs text-primary hover:underline">
              {T("查看全部 →", "View all →")}
            </Link>
          </div>
          {!session ? (
            <p className="text-sm text-muted">
              {T("登入後即可查看您的收藏", "Sign in to see your bookmarks")}
            </p>
          ) : recentBookmarks.length === 0 ? (
            <p className="text-sm text-muted">
              {T("尚無收藏。瀏覽中藥/方劑/穴位/證型時可點擊星標收藏。", "No bookmarks yet. Star any herb/formula/acupoint/pattern while browsing.")}
            </p>
          ) : (
            <ul className="space-y-2">
              {recentBookmarks.map((b) => {
                const base = bkHrefBase[b.entityType] ?? `/${b.entityType.toLowerCase()}s`;
                const name = bkNameMap.get(b.entityId) ?? b.entityId.slice(0, 12) + "…";
                const typeLabel = isZh
                  ? (bkTypeLabelZh[b.entityType] ?? b.entityType)
                  : (bkTypeLabel[b.entityType] ?? b.entityType);
                return (
                  <li key={b.id}>
                    <Link href={`${base}/${b.entityId}`} className="flex items-center gap-2 text-sm hover:text-primary group">
                      <span className="shrink-0 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                        {typeLabel}
                      </span>
                      <span className="truncate group-hover:text-primary transition-colors">{name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">{T("📰 本週重要研究", "📰 This Week's High-Impact Studies")}</h2>
            <Link href="/evidence" className="text-xs text-primary hover:underline">
              {T("查看全部 →", "View all →")}
            </Link>
          </div>
          <ul className="space-y-3">
            {recentEvidence.map((e) => (
              <li key={e.id}>
                <Link href={`/evidence/${e.id}`} className="block group">
                  <div className="text-sm font-medium group-hover:text-primary line-clamp-2">
                    {e.title}
                  </div>
                  <div className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${
                      e.evidenceGrade === "A"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      Grade {e.evidenceGrade}
                    </span>
                    <span>{e.studyType}</span>
                    {e.journal && <span>· {e.journal} ({e.year})</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upgrade CTA banner — visible to free/anon users */}
      {(!session || session.user.role === "PUBLIC") && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-8 mb-6">
          <div className="grid gap-6 md:grid-cols-[1fr,auto] items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {T("解鎖完整臨床工作流程", "Unlock the Full Clinical Workflow")}
              </h2>
              <p className="text-muted leading-relaxed mb-4">
                {T(
                  "升級至 Professional 版即可使用 AI 處方拍照辨識、處方建構器、病例管理、PDF 列印、即時藥物交互警示等全套臨床工具。",
                  "Upgrade to Professional for AI prescription scanning, prescription builder, patient case management, PDF printing, and real-time interaction alerts.",
                )}
              </p>
              <ul className="text-sm text-muted space-y-1 mb-2">
                <li>✓ {T("HK$ 388 / 月（約美元 49）", "HK$388/mo (~USD 49)")}</li>
                <li>✓ {T("14 天免費試用，無需信用卡", "14-day free trial, no credit card needed")}</li>
                <li>✓ {T("隨時取消", "Cancel anytime")}</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/pricing"
                className="rounded-lg bg-primary text-white px-6 py-3 font-semibold text-center hover:bg-primary-light transition-colors"
              >
                {T("查看訂閱方案", "View Pricing")}
              </Link>
              <Link
                href="/register?plan=professional"
                className="rounded-lg border border-primary/40 px-6 py-3 text-center text-sm hover:bg-primary/5 transition-colors"
              >
                {T("立即試用", "Start Trial")}
              </Link>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted">
        {T(
          "EBTCM Clinical Decision Support · 489 種中藥 · 281 個方劑 · 377 個穴位 · 685+ 條證據",
          "EBTCM Clinical Decision Support · 489 herbs · 281 formulas · 377 acupoints · 685+ evidence entries",
        )}
      </p>
    </div>
  );
}
