// Claims lint for anything we publish: listing copy, social captions, product
// pages. Pure; tests/claims.test.ts.
//
// Our honest claim is narrow: "cheapest of N sources we checked at HH:MM".
// Hong Kong's Trade Descriptions Ordinance makes an unsubstantiated "lowest
// price" a false trade description, and a fake countdown is a misleading
// omission. This lint blocks publication; it does not merely warn.

export interface ClaimIssue {
  rule: string;
  match: string;
  fix: string;
}

interface Rule {
  rule: string;
  re: RegExp;
  fix: string;
}

const RULES: Rule[] = [
  {
    rule: "UNSUBSTANTIATED_CHEAPEST",
    re: /(cheapest\s+(in\s+the\s+)?(world|anywhere|online|price)|lowest\s+price\s+(guaranteed|anywhere|in\s+the\s+world)|best\s+price\s+guaranteed|全(球|世界|網|网|港)最(平|低|便宜)|最低價保證|最低价保证|保證最平|保证最低)/i,
    fix: '改為「我哋 HH:MM 查咗 N 個來源中最平」— say "cheapest of N sources checked at HH:MM"',
  },
  {
    rule: "FAKE_SCARCITY",
    re: /(only\s+\d+\s+(?:[a-z]+\s+){0,2}left|last\s+chance|selling\s+fast|最後\s*\d+\s*件|最后\s*\d+\s*件|僅剩|仅剩|手快有手慢冇|限時搶購|限时抢购)/i,
    fix: "只可以寫真實數字（例如拼單尚欠件數）— only state real, live quantities",
  },
  {
    rule: "AUTHENTICITY_CLAIM",
    re: /(100%\s*(authentic|genuine|original)|guaranteed\s+(authentic|genuine)|正品保證|正品保证|100%\s*正品|原裝正貨保證)/i,
    fix: "我哋未驗貨，不可保證正品 — we do not inspect goods; do not guarantee authenticity",
  },
  {
    rule: "MEDICAL_CLAIM",
    re: /(cures?|treats?|heals?|prevents?\s+(cancer|covid|disease)|治療|治疗|根治|醫治|包醫)/i,
    fix: "刪除療效聲稱 — remove therapeutic claims",
  },
];

/**
 * `allowScarcity` is for pool copy that states the live remaining quantity
 * computed from the database ("尚欠 3 件") — the one scarcity statement that is true.
 */
export function lintClaims(text: string, opts: { allowScarcity?: boolean } = {}): ClaimIssue[] {
  const issues: ClaimIssue[] = [];
  for (const r of RULES) {
    if (opts.allowScarcity && r.rule === "FAKE_SCARCITY") continue;
    const m = text.match(r.re);
    if (m) issues.push({ rule: r.rule, match: m[0], fix: r.fix });
  }
  return issues;
}

/** The substantiated wording, generated rather than hand-typed. */
export function cheapestClaim(sourceCount: number, checkedAt: Date): string {
  const hh = checkedAt.toLocaleTimeString("en-HK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Hong_Kong",
  });
  return `${hh} 查咗 ${sourceCount} 個來源中最平 · cheapest of ${sourceCount} sources checked at ${hh} HKT`;
}
