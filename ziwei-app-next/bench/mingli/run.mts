/**
 * MingLi-Bench harness — evaluates how well an LLM answers the 160
 * Global Fortune Teller Competition questions (2022-2025) when fed charts
 * computed by OUR engine (@ziwei/engine), vs. no chart at all.
 *
 * Benchmark: https://github.com/DestinyLinker/MingLi-Bench (MIT).
 * data.json was vendored into this folder; questions are multiple-choice,
 * scored by exact letter match.
 *
 * Usage (from repo root):
 *   npx tsx bench/mingli/run.mts --dry --limit 3            # build prompts only, no API calls
 *   npx tsx bench/mingli/run.mts --mode engine --limit 20   # billed: needs ANTHROPIC_API_KEY
 *   npx tsx bench/mingli/run.mts --mode none                # baseline without charts
 *
 * Flags: --mode none|engine (default engine), --model <id>, --limit N,
 *        --category 婚姻, --concurrency N (default 3), --dry
 * Results land in bench/mingli/results/<stamp>-<model>-<mode>.json.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeChart,
  computeBazi,
  detectPatterns,
  computeSelfTransformations,
  traceJiChains,
  ziweiYearFlow,
  ganzhiOfYear,
  tenGodVsDayMaster,
  decadeAtYear,
  minorLimitAtYear,
  branchRelation,
  type BirthInfo,
  type Chart,
  type BaziChart,
  type EarthlyBranch,
  type HeavenlyStem,
} from '../../packages/engine/src/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name: string) => args.includes(`--${name}`);

const MODE = (flag('mode') ?? 'engine') as 'none' | 'engine' | 'engine+' | 'engine-t';
const MODEL = flag('model') ?? 'claude-haiku-4-5-20251001';
const LIMIT = flag('limit') ? Number(flag('limit')) : Infinity;
const CATEGORY = flag('category');
const CONCURRENCY = flag('concurrency') ? Number(flag('concurrency')) : 3;
const DRY = has('dry');

// ── benchmark data ───────────────────────────────────────────────────
interface BenchQuestion {
  id: string;
  case_id: string;
  birth_info: {
    raw: string; gender: string; year: number; month: number; day: number;
    hour: number; minute: number; calendar_type: string;
  };
  question: string;
  options: Array<{ letter: string; text: string }>;
  answer: string;
  category: string;
  has_answer: boolean;
}

const data = JSON.parse(readFileSync(path.join(__dirname, 'data.json'), 'utf8')) as {
  questions: BenchQuestion[];
};

let questions = data.questions.filter((q) => q.has_answer && q.birth_info?.year);
if (CATEGORY) questions = questions.filter((q) => q.category === CATEGORY);
if (Number.isFinite(LIMIT)) questions = questions.slice(0, LIMIT);

// ── engine context serialization (compact; standalone from the web app) ──
function toBirth(b: BenchQuestion['birth_info']): BirthInfo {
  return {
    year: b.year, month: b.month, day: b.day,
    hour: b.hour, minute: b.minute ?? 0,
    gender: b.gender === '女' ? 'F' : 'M',
    calendar: 'solar',
  };
}

function ziweiBlock(chart: Chart): string {
  const palaces = chart.palaces
    .map((p) => {
      const stars = p.stars.length
        ? p.stars.map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? '化' + s.transformation : ''}`).join('、')
        : '空宮';
      return `${p.name}(${p.ganzhi}${p.isShenGong ? ' 身宮' : ''}): ${stars}`;
    })
    .join('\n');
  const lines = [`五行局: ${chart.bureau.bureau}　年柱: ${chart.yearGanzhi}`, palaces];
  if (chart.decades?.length) {
    lines.push(
      '大限: ' + chart.decades.slice(0, 9).map((d) => {
        const startYear = chart.birthInfo.year + d.startAge - 1;
        return `${d.startAge}-${d.endAge}歲(${startYear}起)行${d.palaceName} 限忌${d.transformations.忌}`;
      }).join('；'),
    );
  }
  const pats = detectPatterns(chart);
  if (pats.length) lines.push('格局: ' + pats.map((p) => `${p.name}(${p.kind})`).join('、'));
  const self = computeSelfTransformations(chart);
  if (self.length) lines.push('自化: ' + self.map((s) => `${s.palace}${s.kind}化${s.hua}`).join('、'));
  if (MODE === 'engine+') {
    if (chart.mingLord) lines.push(`命主${chart.mingLord} 身主${chart.shenLord}`);
    const keyStarts = new Set(['命宮', '夫妻', '財帛', '疾厄', '官祿']);
    const chains = traceJiChains(chart).filter((c) => keyStarts.has(c.start));
    if (chains.length) lines.push('化忌連環: ' + chains.map((c) => c.text).join('；'));
  }
  return lines.join('\n');
}

function baziBlock(chart: BaziChart): string {
  const p = chart.pillars;
  const lines = [
    `四柱: ${p.year.ganzhi} ${p.month.ganzhi} ${p.day.ganzhi} ${p.hour.ganzhi}　日主${chart.dayMaster}${chart.dayMasterElement}`,
    `十神: 年${p.year.stemTenGod} 月${p.month.stemTenGod} 時${p.hour.stemTenGod}`,
    `大運: ${chart.luckPillars.map((lp) => `${lp.startAge}歲${lp.ganzhi}(${lp.startYear}-${lp.endYear})`).join('；')}`,
  ];
  const s = chart.strength;
  if (s) {
    lines.push(`日主強弱: ${s.verdict}(月令${s.seasonalState}${s.deLing ? '得令' : '失令'}, 根${s.roots})　喜用: ${s.favorableElements.join('、')}　忌: ${s.unfavorableElements.join('、')}　空亡: ${s.voidBranches.join('、')}`);
  }
  if (MODE === 'engine+') {
    if (s?.climateAdjustment) lines.push(`調候: ${s.climateAdjustment.reason}`);
    if (chart.shenSha?.length) {
      const cn = { year: '年', month: '月', day: '日', hour: '時' } as const;
      lines.push('神煞: ' + chart.shenSha.map((h) => `${h.name}(${cn[h.pillar]})`).join('、'));
    }
    if (chart.taiYuan) lines.push(`胎元${chart.taiYuan} 命宮${chart.mingGong ?? ''}`);
  }
  return lines.join('\n');
}

/** Years mentioned in the question/options — the timing mode computes flows for each. */
function questionYears(q: BenchQuestion): number[] {
  const text = q.question + ' ' + q.options.map((o) => o.text).join(' ');
  const years = [...text.matchAll(/(19|20)\d{2}/g)].map((m) => Number(m[0]));
  return [...new Set(years)].filter((y) => y > q.birth_info.year && y <= q.birth_info.year + 100).slice(0, 6);
}

/** Per-year timing block: 大限 + 流年落宮 + 小限 + 八字流年十神/沖合. */
function timingBlock(ziwei: Chart, bazi: BaziChart, years: number[]): string {
  const lines: string[] = [];
  for (const year of years) {
    const gz = ganzhiOfYear(year);
    const zf = ziweiYearFlow(ziwei, year, ziwei.birthInfo.year);
    const decade = ziwei.decades ? decadeAtYear(ziwei.decades, ziwei.birthInfo.year, year) : undefined;
    const minor = minorLimitAtYear(ziwei, year);
    const tg = tenGodVsDayMaster(gz[0] as HeavenlyStem, bazi.dayMaster);
    const rel = branchRelation(gz[1] as EarthlyBranch, bazi.pillars.day.branch);
    const flowStars = zf.hostPalace?.stars.map((s) => s.name).join('、') || '空宮';
    lines.push(
      `${year}年(${gz}, 虛歲${year - ziwei.birthInfo.year + 1}): ` +
      `${decade ? `行${decade.palaceName}大限(限忌${decade.transformations.忌})；` : ''}` +
      `流年入本命${zf.hostPalace?.name ?? '—'}宮[${flowStars}]；` +
      `${minor ? `小限在${minor.palaceName}；` : ''}` +
      `八字流年${tg}${rel ? `、${gz[1]}${rel}日支` : ''}`,
    );
  }
  return lines.join('\n');
}

function buildPrompt(q: BenchQuestion): { system: string; user: string } {
  const systemLines = [
    '你是一位精通八字與紫微斗數的命理宗師，正在參加全球算命師大賽的選擇題測驗。',
  ];
  if (MODE === 'engine-t') {
    systemLines.push(
      '判斷某年吉凶時，依序推理：1) 該年所行大限宮與限忌所傷之領域；2) 流年落於本命何宮、宮中星曜吉凶；3) 八字流年十神與日支沖合對日主的壓力；4) 三層同指一個領域時才下重話。題目類別提示了答案所屬領域，先排除與該年運勢方向矛盾的選項。',
    );
  }
  systemLines.push('仔細推理後作答。最後一行必須是「答案：X」（X 為 A/B/C/D 其中一個字母），不得有其他結尾。');
  const system = systemLines.join('\n');

  const parts = [`命主: ${q.birth_info.raw}`];
  if (MODE !== 'none') {
    const birth = toBirth(q.birth_info);
    try {
      const ziwei = computeChart(birth);
      const bazi = computeBazi(birth);
      parts.push('', '【紫微斗數盤（引擎排定）】', ziweiBlock(ziwei));
      parts.push('', '【八字盤（引擎排定）】', baziBlock(bazi));
      if (MODE === 'engine-t') {
        const years = questionYears(q);
        if (years.length) {
          parts.push('', '【題目相關年份之行運（引擎排定）】', timingBlock(ziwei, bazi, years));
        }
      }
    } catch (err) {
      parts.push('', `（排盤失敗: ${(err as Error).message}，請自行排盤）`);
    }
  }
  parts.push('', `【題目／類別: ${q.category}】`, q.question, ...q.options.map((o) => `${o.letter}. ${o.text}`));
  return { system, user: parts.join('\n') };
}

// ── model APIs (provider inferred from model id, like the app's cascade) ──
async function withRetry(fn: () => Promise<Response>, retries = 6): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fn();
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= retries) throw new Error(`API ${res.status} after ${retries} retries`);
      // free-tier RPM limits need patient backoff
      await new Promise((r) => setTimeout(r, 12_000 * (attempt + 1)));
      continue;
    }
    return res;
  }
}

async function askModel(system: string, user: string): Promise<string> {
  if (MODEL.startsWith('claude')) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set');
    const res = await withRetry(() => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, temperature: 0, system, messages: [{ role: 'user', content: user }] }),
    }));
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return json.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
  }
  if (MODEL.startsWith('gemini')) {
    const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    const res = await withRetry(() => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          // thinkingBudget 0: 2.5-flash otherwise burns the output budget on thoughts
          generationConfig: { temperature: 0, maxOutputTokens: 2000, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    ));
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  }
  // OpenAI-compatible
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const res = await withRetry(() => fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, temperature: 0, max_completion_tokens: 1500,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  }));
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return json.choices[0]?.message?.content ?? '';
}

function extractAnswer(text: string): string | null {
  const tail = [...text.matchAll(/答案[：:]\s*([ABCD])/g)];
  if (tail.length) return tail[tail.length - 1][1];
  const bare = [...text.matchAll(/\b([ABCD])\b/g)];
  return bare.length ? bare[bare.length - 1][1] : null;
}

// ── run ──────────────────────────────────────────────────────────────
interface ResultRow {
  id: string; category: string; expected: string;
  got: string | null; correct: boolean; raw?: string;
}

async function main() {
  console.log(`MingLi-Bench: ${questions.length} questions | mode=${MODE} | model=${MODEL}${DRY ? ' | DRY RUN' : ''}`);

  if (DRY) {
    const sample = questions.slice(0, 2).map((q) => buildPrompt(q));
    for (const s of sample) {
      console.log('────── system ──────\n' + s.system);
      console.log('────── user ──────\n' + s.user + '\n');
    }
    const totalChars = questions.reduce((acc, q) => acc + buildPrompt(q).user.length, 0);
    console.log(`~${Math.round(totalChars / questions.length)} chars/prompt avg, ${totalChars} total (≈${Math.round(totalChars / 2.5 / 1000)}k input tokens est.)`);
    return;
  }

  const results: ResultRow[] = [];
  let next = 0;
  const worker = async () => {
    while (next < questions.length) {
      const q = questions[next++];
      const { system, user } = buildPrompt(q);
      try {
        const text = await askModel(system, user);
        const got = extractAnswer(text);
        results.push({
          id: q.id, category: q.category, expected: q.answer, got, correct: got === q.answer,
          ...(got === null ? { raw: text.slice(0, 300) } : {}),
        });
        process.stdout.write(got === q.answer ? '✓' : '✗');
      } catch (err) {
        results.push({ id: q.id, category: q.category, expected: q.answer, got: null, correct: false, raw: (err as Error).message });
        process.stdout.write('!');
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, questions.length) }, worker));
  console.log('');

  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const byCat = new Map<string, { total: number; correct: number }>();
  for (const r of results) {
    const c = byCat.get(r.category) ?? { total: 0, correct: 0 };
    c.total += 1;
    if (r.correct) c.correct += 1;
    byCat.set(r.category, c);
  }

  console.log(`\nAccuracy: ${correct}/${total} = ${((correct / total) * 100).toFixed(1)}%`);
  for (const [cat, c] of [...byCat.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${cat}: ${c.correct}/${c.total} (${((c.correct / c.total) * 100).toFixed(0)}%)`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, 'results');
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${stamp}-${MODEL}-${MODE}.json`);
  writeFileSync(outFile, JSON.stringify({ model: MODEL, mode: MODE, total, correct, byCategory: Object.fromEntries(byCat), results }, null, 2));
  console.log(`\nSaved: ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
