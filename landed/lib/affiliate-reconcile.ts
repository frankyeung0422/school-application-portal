// Pure: turn a programme's commission report into ledger decisions. No DB.
// tests/affiliate-reconcile.test.ts.
//
// Every outbound click carries a sub-ID (`L<clickId>`, see subIdFor). The
// programme echoes it back in its report (Amazon "Sub Tag", eBay EPN "Custom
// ID"), which is the only honest way to say which click earned which commission.
//
// A row is booked only when the programme reports it as earned/approved/paid.
// Pending rows are shown, never booked; reversals undo a booked line.

import { clickIdFromSubId } from "./affiliate";

export type Programme = "AMAZON" | "EBAY";
export const PROGRAMMES: Programme[] = ["AMAZON", "EBAY"];

export type RowDecision = "BOOK" | "PENDING" | "REVERSE" | "SKIP";

export interface CommissionRow {
  programme: Programme;
  /** Stable per programme: the order / transaction id, or a hash of the row. */
  externalRef: string;
  subId: string | null;
  clickId: number | null;
  /** Commission in the report's currency; negative for returns/adjustments. */
  amount: number;
  currency: string;
  occurredAt: string | null;
  decision: RowDecision;
  reason: string;
}

// Header aliases, lower-cased with punctuation stripped (see norm()).
const H = {
  subId: ["subtag", "sub tag", "subid", "sub id", "custom id", "customid", "tracking sub id"],
  amount: ["ad fees", "commission", "earnings", "total earnings", "commission amount", "ad fee"],
  ref: ["order id", "transaction id", "event id", "tracking id order", "order number", "item id"],
  status: ["status", "event type", "commission status", "transaction status"],
  date: ["date shipped", "event date", "date", "order date", "transaction date"],
  currency: ["currency", "earnings currency"],
};

function norm(h: string): string {
  return h
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // "Ad Fees($)" → "ad fees"
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** RFC-4180-ish: quoted fields, doubled quotes, commas/newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === "," || c === "\t") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

function findCol(headers: string[], aliases: string[]): number {
  const n = headers.map(norm);
  for (const a of aliases) {
    const i = n.indexOf(a);
    if (i >= 0) return i;
  }
  return -1;
}

function money(v: string | undefined): number | null {
  if (v == null) return null;
  const t = v.replace(/[,$\s]|US|HK|USD|HKD/g, "");
  const neg = /^\(.*\)$/.test(t); // accounting negatives: (1.23)
  const x = Number(t.replace(/[()]/g, ""));
  if (!Number.isFinite(x)) return null;
  return neg ? -x : x;
}

const PAID = /\b(paid|approved|locked|confirmed|earned|winning bid|revenue|valid)\b/i;
const PENDING = /\b(pending|open|unconfirmed|processing|in review)\b/i;
const REVERSED = /\b(reversed|returned|return|cancel(l)?ed|void(ed)?|refund(ed)?|declined|rejected|chargeback)\b/i;

function decide(status: string | null, amount: number): { decision: RowDecision; reason: string } {
  if (amount === 0) return { decision: "SKIP", reason: "zero commission" };
  if (status && REVERSED.test(status)) return { decision: "REVERSE", reason: `programme status "${status}"` };
  if (amount < 0) return { decision: "REVERSE", reason: "negative commission (return/adjustment)" };
  if (status && PENDING.test(status)) return { decision: "PENDING", reason: `programme status "${status}"` };
  if (status && PAID.test(status)) return { decision: "BOOK", reason: `programme status "${status}"` };
  if (status) return { decision: "PENDING", reason: `unrecognised status "${status}" — not booked` };
  // Amazon's earnings report has no status column: every row in it is earned.
  return { decision: "BOOK", reason: "earnings report row" };
}

function rowHash(cells: string[]): string {
  // FNV-1a — a stable ref when the report has no order id, so re-imports stay idempotent.
  let h = 0x811c9dc5;
  for (const ch of cells.join("\u0001")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return `row-${(h >>> 0).toString(16)}`;
}

export interface ParseResult {
  rows: CommissionRow[];
  errors: string[];
}

export function parseCommissionReport(programme: Programme, csv: string, defaultCurrency = "USD"): ParseResult {
  const table = parseCsv(csv);
  const errors: string[] = [];
  // Some exports put a title line above the header: take the first row that has an amount column.
  const headerAt = table.findIndex((r) => findCol(r, H.amount) >= 0);
  if (headerAt < 0) return { rows: [], errors: ["no commission/earnings column found — is this the earnings report?"] };
  const headers = table[headerAt];
  const col = {
    subId: findCol(headers, H.subId),
    amount: findCol(headers, H.amount),
    ref: findCol(headers, H.ref),
    status: findCol(headers, H.status),
    date: findCol(headers, H.date),
    currency: findCol(headers, H.currency),
  };
  if (col.subId < 0) errors.push("no Sub Tag / Custom ID column: rows can be booked but not attributed to a click");
  const seen = new Map<string, number>();
  const rows: CommissionRow[] = [];
  for (const cells of table.slice(headerAt + 1)) {
    const amount = money(cells[col.amount]);
    if (amount == null) continue; // blank/footer lines
    if (/^\s*(grand\s+)?totals?\b/i.test(cells[0] ?? "")) continue; // a sum, not a commission
    const subId = col.subId >= 0 ? cells[col.subId]?.trim() || null : null;
    const status = col.status >= 0 ? cells[col.status]?.trim() || null : null;
    let ref = col.ref >= 0 ? cells[col.ref]?.trim() : "";
    if (!ref) ref = rowHash(cells);
    // One order can carry several items; keep each line distinct but stable.
    const n = (seen.get(ref) ?? 0) + 1;
    seen.set(ref, n);
    const externalRef = n > 1 ? `${ref}#${n}` : ref;
    rows.push({
      programme,
      externalRef,
      subId,
      clickId: clickIdFromSubId(subId),
      amount,
      currency: (col.currency >= 0 ? cells[col.currency]?.trim() : "") || defaultCurrency,
      occurredAt: col.date >= 0 ? cells[col.date]?.trim() || null : null,
      ...decide(status, amount),
    });
  }
  return { rows, errors };
}

/** The idempotency key: same scheme as the manual admin "affiliate" op. */
export function commissionSourceRef(programme: Programme, externalRef: string): string {
  return `affiliate:${programme}:${externalRef}`;
}

export interface ReconcileSummary {
  book: CommissionRow[];
  pending: CommissionRow[];
  reverse: CommissionRow[];
  skipped: CommissionRow[];
  /** Has a sub-ID we issued, but no such click exists (another site's tag, or a deleted DB). */
  unknownClick: CommissionRow[];
}

export function reconcile(rows: CommissionRow[], knownClickIds: Set<number>): ReconcileSummary {
  const out: ReconcileSummary = { book: [], pending: [], reverse: [], skipped: [], unknownClick: [] };
  for (const r of rows) {
    if (r.clickId != null && !knownClickIds.has(r.clickId)) out.unknownClick.push(r);
    if (r.decision === "BOOK") out.book.push(r);
    else if (r.decision === "PENDING") out.pending.push(r);
    else if (r.decision === "REVERSE") out.reverse.push(r);
    else out.skipped.push(r);
  }
  return out;
}
