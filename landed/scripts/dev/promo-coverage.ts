import { readFileSync } from "node:fs";
import { normalizeOpw } from "../../lib/supermarket/opw";
const r = normalizeOpw(JSON.parse(readFileSync(process.argv[2], "utf8")));
let promos = 0, parsed = 0; const unparsed = new Set<string>();
for (const i of r.items) for (const p of i.promos) { promos++; if (p.rules.length) parsed++; else unparsed.add(p.en); }
console.log("items", r.items.length, "skipped", r.skipped, "unknown", r.unknownRetailers, "promos", promos, "parsed", parsed, `${((parsed / promos) * 100).toFixed(1)}%`);
console.log([...unparsed]);
