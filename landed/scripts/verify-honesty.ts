import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Structural honesty checks that unit tests cannot express:
//  1. Only lib/ledger.ts writes LedgerEntry rows.
//  2. The ledger and the P&L pages never import projections.
//  3. No shipped UI/copy claims "cheapest in the world" (outside the lint that bans it).
//  4. Nothing but the action bus calls a channel adapter's publish/delist or a
//     payment provider's authorize/capture directly from a route.

const ROOT = path.resolve(__dirname, "..");
const SKIP = new Set(["node_modules", ".next", "tests", "e2e", "scripts", "prisma", "test-results", ".cache"]);

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(ROOT).map((f) => ({ rel: path.relative(ROOT, f).replace(/\\/g, "/"), src: readFileSync(f, "utf8") }));
const failures: string[] = [];

for (const f of files) {
  if (/ledgerEntry\.(create|update|upsert|delete|createMany|updateMany|deleteMany)\(/.test(f.src) && f.rel !== "lib/ledger.ts") {
    failures.push(`${f.rel}: writes LedgerEntry outside lib/ledger.ts`);
  }
  const realMoneyCode = f.rel === "lib/ledger.ts" || f.rel === "app/admin/page.tsx" || f.rel === "lib/listings.ts" || f.rel === "lib/orders.ts";
  if (realMoneyCode && /from\s+["'][^"']*projections["']/.test(f.src)) {
    failures.push(`${f.rel}: imports projections into real-money code`);
  }
  if (f.rel !== "lib/claims.ts" && /(cheapest in the world|全(球|世界|港)最平|最低價保證)/i.test(f.src)) {
    failures.push(`${f.rel}: contains an unsubstantiated cheapest claim`);
  }
  if (f.rel.startsWith("app/") && /\.(authorize|capture|cancelAuthorization)\(/.test(f.src)) {
    failures.push(`${f.rel}: route calls the payment provider's authorize/capture directly (use the action bus)`);
  }
  if (f.rel.startsWith("app/") && /getChannel\([^)]*\)\.(publish|delist|updatePrice)\(/.test(f.src)) {
    failures.push(`${f.rel}: route calls a channel adapter directly (use the action bus)`);
  }
}

if (failures.length) {
  console.error(`verify-honesty: ${failures.length} failure(s)\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log(`verify-honesty: ${files.length} files clean`);
