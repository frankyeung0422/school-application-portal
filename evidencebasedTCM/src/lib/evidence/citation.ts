// Citation export helpers (BibTeX, RIS).

export interface CiteSource {
  id: string;
  title: string;
  authors?: string | null;
  journal?: string | null;
  year?: number | null;
  doi?: string | null;
  pubmedId?: string | null;
  studyType?: string | null;
}

function bibKey(e: CiteSource): string {
  const first = (e.authors ?? "").split(/[,;&]/)[0].trim().split(/\s+/).pop() || "Anon";
  return `${first}${e.year ?? "nd"}${e.id.slice(-4)}`.replace(/[^a-zA-Z0-9_]/g, "");
}

export function toBibTeX(e: CiteSource): string {
  const key = bibKey(e);
  const fields: string[] = [
    `  title = {${e.title}}`,
    e.authors ? `  author = {${e.authors}}` : null,
    e.journal ? `  journal = {${e.journal}}` : null,
    e.year ? `  year = {${e.year}}` : null,
    e.doi ? `  doi = {${e.doi}}` : null,
    e.pubmedId ? `  note = {PMID:${e.pubmedId}}` : null,
  ].filter((x): x is string => !!x);
  return `@article{${key},\n${fields.join(",\n")}\n}\n`;
}

export function toRIS(e: CiteSource): string {
  const lines = [
    "TY  - JOUR",
    `TI  - ${e.title}`,
    ...(e.authors ? e.authors.split(/[;&]| and /).map((a) => `AU  - ${a.trim()}`) : []),
    e.journal ? `JO  - ${e.journal}` : null,
    e.year ? `PY  - ${e.year}` : null,
    e.doi ? `DO  - ${e.doi}` : null,
    e.pubmedId ? `AN  - ${e.pubmedId}` : null,
    "ER  - ",
  ].filter((x): x is string => !!x);
  return lines.join("\n") + "\n";
}

export function freshnessBadge(year?: number | null): {
  label: string;
  tone: "fresh" | "recent" | "aging" | "old" | "unknown";
} {
  if (!year) return { label: "—", tone: "unknown" };
  const current = new Date().getFullYear();
  const age = current - year;
  if (age <= 3) return { label: `${age}y`, tone: "fresh" };
  if (age <= 7) return { label: `${age}y`, tone: "recent" };
  if (age <= 12) return { label: `${age}y`, tone: "aging" };
  return { label: `${age}y`, tone: "old" };
}
