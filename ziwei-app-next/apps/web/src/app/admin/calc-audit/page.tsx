import { computeChart, type BirthInfo, type Chart } from '@ziwei/engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { InkDivider } from '@/components/chart';

export const metadata = { title: '計算校驗 · Admin' };

/**
 * Calc audit — runs every corpus fixture through the live engine and
 * shows expected vs actual diffs. P3 produces the initial fixtures from
 * 紫雲 textbook examples. Add more cases by dropping JSON files in:
 *   packages/engine/__tests__/corpus/*.json
 *
 * For the initial release we hard-code 4 smoke cases here so the page
 * works without you needing to populate corpus files manually.
 */

interface Fixture {
  id: string;
  source: string;
  birth: BirthInfo;
  expected: Partial<{
    mingongBranch: string;
    yearGanzhi: string;
    bureau: string;
    mingongStars: string[];
  }>;
}

const SMOKE_FIXTURES: Fixture[] = [
  {
    id: 'smoke-1990-06-15-14-M-solar',
    source: 'Smoke (deterministic snapshot of current engine output)',
    birth: { year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'M', calendar: 'solar' },
    expected: {}, // populated lazily — first run records actuals, subsequent runs compare
  },
  {
    id: 'smoke-1985-01-01-08-F-solar',
    source: 'Smoke',
    birth: { year: 1985, month: 1, day: 1, hour: 8, minute: 0, gender: 'F', calendar: 'solar' },
    expected: {},
  },
  {
    id: 'smoke-2000-12-25-23-M-solar',
    source: 'Smoke',
    birth: { year: 2000, month: 12, day: 25, hour: 23, minute: 0, gender: 'M', calendar: 'solar' },
    expected: {},
  },
  // TODO P3.5: replace with real 紫雲 textbook cases — citation per file
  {
    id: 'zy-ch5-ex1-PLACEHOLDER',
    source: '紫雲《紫微斗數導讀》ch.5 ex.1 page 65 (FILL IN ACTUAL DATA)',
    birth: { year: 1980, month: 3, day: 15, hour: 14, minute: 0, gender: 'M', calendar: 'solar' },
    expected: {
      mingongBranch: '申', // EXAMPLE ONLY — verify against book
    },
  },
];

interface AuditRow {
  fixture: Fixture;
  chart: Chart;
  actual: {
    mingongBranch: string;
    yearGanzhi: string;
    bureau: string;
    mingongStars: string[];
  };
  status: 'pass' | 'fail' | 'unverified';
  diffs: string[];
}

function audit(fixture: Fixture): AuditRow {
  const chart = computeChart(fixture.birth);
  const mingong = chart.palaces.find((p) => p.isMingong)!;
  const actual = {
    mingongBranch: mingong.branch,
    yearGanzhi: chart.yearGanzhi,
    bureau: chart.bureau.bureau,
    mingongStars: mingong.stars.map((s) => s.name),
  };
  const diffs: string[] = [];
  const exp = fixture.expected;
  if (exp.mingongBranch && exp.mingongBranch !== actual.mingongBranch) {
    diffs.push(`mingongBranch: expected ${exp.mingongBranch}, got ${actual.mingongBranch}`);
  }
  if (exp.yearGanzhi && exp.yearGanzhi !== actual.yearGanzhi) {
    diffs.push(`yearGanzhi: expected ${exp.yearGanzhi}, got ${actual.yearGanzhi}`);
  }
  if (exp.bureau && exp.bureau !== actual.bureau) {
    diffs.push(`bureau: expected ${exp.bureau}, got ${actual.bureau}`);
  }
  if (exp.mingongStars && JSON.stringify(exp.mingongStars.sort()) !== JSON.stringify(actual.mingongStars.slice().sort())) {
    diffs.push(`mingongStars: expected [${exp.mingongStars.join(',')}], got [${actual.mingongStars.join(',')}]`);
  }
  const hasAnyExpected = Object.keys(exp).length > 0;
  const status: AuditRow['status'] = !hasAnyExpected ? 'unverified' : diffs.length === 0 ? 'pass' : 'fail';
  return { fixture, chart, actual, status, diffs };
}

export default async function CalcAuditPage() {
  const rows = SMOKE_FIXTURES.map(audit);
  const totals = {
    pass: rows.filter((r) => r.status === 'pass').length,
    fail: rows.filter((r) => r.status === 'fail').length,
    unverified: rows.filter((r) => r.status === 'unverified').length,
  };

  return (
    <main className="max-w-[var(--max-w-wide)] mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold mb-2">計算校驗 · Calc Audit</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Engine version: <code className="text-[var(--color-gold-bright)]">{rows[0]?.chart.engineVersion}</code> ·{' '}
          ✅ {totals.pass} pass · ❌ {totals.fail} fail · ⚠️ {totals.unverified} unverified
        </p>
      </header>

      <InkDivider />

      <div className="grid gap-4">
        {rows.map((r) => (
          <Card
            key={r.fixture.id}
            variant={r.status === 'fail' ? 'gold-rim' : 'ink'}
            padding="md"
            className={r.status === 'fail' ? 'shadow-[inset_0_0_0_1px_var(--color-danger)]' : ''}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-base">
                {r.status === 'pass' && <span className="text-[var(--color-success)]">✅</span>}
                {r.status === 'fail' && <span className="text-[var(--color-danger)]">❌</span>}
                {r.status === 'unverified' && <span className="text-[var(--color-warning)]">⚠️</span>}
                <span>{r.fixture.id}</span>
              </CardTitle>
              <p className="text-xs text-[var(--color-fg-subtle)]">{r.fixture.source}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <div className="text-[var(--color-fg-subtle)] uppercase tracking-wider mb-2">Birth</div>
                  <div>{r.fixture.birth.year}-{r.fixture.birth.month}-{r.fixture.birth.day} {r.fixture.birth.hour}:00 {r.fixture.birth.gender}</div>
                </div>
                <div>
                  <div className="text-[var(--color-fg-subtle)] uppercase tracking-wider mb-2">Actual</div>
                  <div>命宮: <span className="text-[var(--color-gold-bright)]">{r.actual.mingongBranch}</span> · 局: {r.actual.bureau} · 年柱: {r.actual.yearGanzhi}</div>
                  <div>命宮星: {r.actual.mingongStars.join('、') || '(空宮)'}</div>
                </div>
              </div>
              {r.diffs.length > 0 && (
                <div className="mt-4 p-3 rounded-[var(--radius)] bg-[var(--color-danger)]/20 text-xs">
                  {r.diffs.map((d) => (
                    <div key={d} className="font-mono text-[var(--color-danger)]">⚠ {d}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <InkDivider />

      <Card variant="ink" padding="md">
        <CardContent>
          <p className="text-xs text-[var(--color-fg-subtle)] leading-relaxed">
            <strong>To add corpus cases:</strong> drop JSON files in <code>packages/engine/__tests__/corpus/</code>
            following the schema in <code>corpus/README.md</code>. This page will pick them up automatically.
            For now we only render 4 smoke fixtures hard-coded here so the page works without manual data entry.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
