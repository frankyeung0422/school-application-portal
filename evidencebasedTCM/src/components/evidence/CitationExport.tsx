"use client";

import { useState } from "react";
import { toBibTeX, toRIS, type CiteSource } from "@/lib/evidence/citation";

export function CitationExport({ source }: { source: CiteSource }) {
  const [format, setFormat] = useState<"bibtex" | "ris">("bibtex");
  const text = format === "bibtex" ? toBibTeX(source) : toRIS(source);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citation.${format === "bibtex" ? "bib" : "ris"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-border p-3 bg-surface">
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setFormat("bibtex")}
            className={`px-2 py-1 ${format === "bibtex" ? "bg-primary text-white" : "text-muted"}`}
          >
            BibTeX
          </button>
          <button
            type="button"
            onClick={() => setFormat("ris")}
            className={`px-2 py-1 ${format === "ris" ? "bg-primary text-white" : "text-muted"}`}
          >
            RIS
          </button>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={copy}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-primary/5"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={download}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-primary/5"
          >
            Download
          </button>
        </div>
      </div>
      <pre className="max-h-40 overflow-auto rounded bg-background p-2 text-xs font-mono whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  );
}
