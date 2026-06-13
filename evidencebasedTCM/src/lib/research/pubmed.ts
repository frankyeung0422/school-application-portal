/**
 * Minimal PubMed E-utilities client.
 *
 * Two endpoints we need:
 *   - esearch.fcgi — query → list of PMIDs
 *   - efetch.fcgi  — PMIDs → article metadata (XML)
 *
 * NCBI requires:
 *   - tool & email parameters identifying the caller (we send them).
 *   - ≤ 3 requests/sec without an API key, ≤ 10/sec with one. We sleep
 *     between requests to stay polite.
 *
 * Set NCBI_API_KEY in .env to lift the rate limit. Set NCBI_TOOL_EMAIL
 * to your contact email (per NCBI's policy).
 */

const ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

const TOOL_NAME = "evidence-based-tcm";
const TOOL_EMAIL = process.env.NCBI_TOOL_EMAIL ?? "noreply@example.com";
const API_KEY = process.env.NCBI_API_KEY;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function commonParams(): URLSearchParams {
  const p = new URLSearchParams({ tool: TOOL_NAME, email: TOOL_EMAIL });
  if (API_KEY) p.set("api_key", API_KEY);
  return p;
}

const REQ_DELAY_MS = API_KEY ? 110 : 350; // ~9 rps with key, ~3 rps without

export interface PubMedArticle {
  pubmedId: string;
  doi: string | null;
  title: string;
  abstract: string | null;
  authors: string;
  journal: string | null;
  year: number | null;
  studyTypeHint: string | null; // PublicationType — e.g. "Randomized Controlled Trial"
}

export async function esearch(
  query: string,
  retmax: number,
  mindate?: number,
  maxdate?: number,
): Promise<string[]> {
  const params = commonParams();
  params.set("db", "pubmed");
  params.set("term", query);
  params.set("retmax", String(retmax));
  params.set("retmode", "json");
  params.set("sort", "relevance");
  if (mindate && maxdate) {
    params.set("mindate", String(mindate));
    params.set("maxdate", String(maxdate));
    params.set("datetype", "pdat");
  }
  await sleep(REQ_DELAY_MS);
  const res = await fetch(`${ESEARCH_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`esearch failed: ${res.status}`);
  const json = (await res.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  return json.esearchresult?.idlist ?? [];
}

/**
 * Tiny XML helper. PubMed XML is well-formed but we don't want a dep —
 * use targeted regex extraction since we only need a handful of fields per
 * article. Safe because we limit to the documented PubMed schema.
 */
function pickAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}
function pickOne(xml: string, tag: string): string | null {
  const all = pickAll(xml, tag);
  return all.length > 0 ? all[0] : null;
}
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)));
}
function clean(s: string | null): string | null {
  if (!s) return null;
  return decodeEntities(stripTags(s));
}

export async function efetch(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];
  const params = commonParams();
  params.set("db", "pubmed");
  params.set("id", pmids.join(","));
  params.set("retmode", "xml");
  params.set("rettype", "abstract");
  await sleep(REQ_DELAY_MS);
  const res = await fetch(`${EFETCH_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`efetch failed: ${res.status}`);
  const xml = await res.text();

  // Split per <PubmedArticle> envelope.
  const articles = pickAll(xml, "PubmedArticle");
  const out: PubMedArticle[] = [];
  for (const a of articles) {
    const pmid = clean(pickOne(a, "PMID")) ?? "";
    if (!pmid) continue;
    const title = clean(pickOne(a, "ArticleTitle")) ?? "";
    if (!title) continue;
    // Abstract may have multiple <AbstractText Label="..."> sections — concat.
    const absParts = pickAll(a, "AbstractText").map((p) => clean(p) ?? "");
    const abs = absParts.filter((x) => x.length > 0).join("\n\n") || null;
    const journal = clean(pickOne(a, "Title")); // <Journal>…<Title>…</Title></Journal>
    // Year is inside Article > Journal > JournalIssue > PubDate > Year (or MedlineDate "2017 Apr").
    let year: number | null = null;
    const pubDate = pickOne(a, "PubDate") ?? "";
    const yEl = pickOne(pubDate, "Year");
    const yMatch = (yEl ?? pubDate).match(/\b(19|20)\d{2}\b/);
    if (yMatch) year = Number(yMatch[0]);
    // Authors: first 3 + et al.
    const authorBlocks = pickAll(a, "Author");
    const names: string[] = [];
    for (const ab of authorBlocks.slice(0, 3)) {
      const last = clean(pickOne(ab, "LastName")) ?? "";
      const ini = clean(pickOne(ab, "Initials")) ?? "";
      if (last) names.push(`${last}${ini ? " " + ini : ""}`);
    }
    if (authorBlocks.length > 3) names.push("et al.");
    const authors = names.join(", ");
    // DOI: <ArticleId IdType="doi">…</ArticleId>
    const doiMatch = a.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
    const doi = doiMatch ? doiMatch[1].trim() : null;
    // Study type hint from <PublicationType>
    const pubTypes = pickAll(a, "PublicationType").map((p) => (clean(p) ?? "").toLowerCase());
    const studyTypeHint = pubTypes.find((p) =>
      p.includes("meta-analysis")
      || p.includes("systematic review")
      || p.includes("randomized controlled trial")
      || p.includes("clinical trial")
      || p.includes("cohort")
      || p.includes("case reports"),
    ) ?? null;

    out.push({
      pubmedId: pmid,
      doi,
      title,
      abstract: abs,
      authors,
      journal,
      year,
      studyTypeHint,
    });
  }
  return out;
}

/**
 * Map a PubMed PublicationType label to your Prisma StudyType enum.
 */
export function studyTypeOf(hint: string | null): "META_ANALYSIS" | "SYSTEMATIC_REVIEW" | "RCT" | "COHORT" | "CASE_SERIES" | "CASE_REPORT" {
  const h = hint?.toLowerCase() ?? "";
  if (h.includes("meta-analysis")) return "META_ANALYSIS";
  if (h.includes("systematic review")) return "SYSTEMATIC_REVIEW";
  if (h.includes("randomized controlled trial") || h.includes("clinical trial")) return "RCT";
  if (h.includes("cohort")) return "COHORT";
  if (h.includes("case reports")) return "CASE_REPORT";
  return "CASE_SERIES";
}
