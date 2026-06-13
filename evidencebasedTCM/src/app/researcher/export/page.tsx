"use client";

import { useState } from "react";
import Link from "next/link";

const DATASETS = [
  {
    type: "evidence",
    icon: "📄",
    title: "Evidence Catalog",
    description: "All published evidence entries: study type, GRADE, effect sizes, DOI links. 625+ entries.",
    fields: "title, studyType, evidenceGrade, authors, journal, year, doi, effectMetric, effectValue, resultsSummary",
  },
  {
    type: "rwe",
    icon: "🏥",
    title: "Real-World Evidence",
    description: "Practitioner-reported outcomes (symptom VAS before/after) + consented patient self-reports, aggregated by pattern and formula.",
    fields: "visitYear, visitMonth, scoreBefore, scoreAfter, delta, pattern, pathologyType, formula",
  },
  {
    type: "network-pharmacology",
    icon: "🔬",
    title: "Network Pharmacology",
    description: "Herb → compound → protein target → KEGG pathway graph. Up to 5,000 edges with confidence scores and BindingDB affinities.",
    fields: "herbPinyin, herbChinese, compound, gene, uniprotId, source, confidence, bindingdbCount, bestAffinityNm",
  },
  {
    type: "condition-outcomes",
    icon: "📊",
    title: "Patient Condition Outcomes",
    description: "Anonymised condition logs from consenting users: condition name, TCM pattern, status, severity, and duration in days.",
    fields: "westernName, icd10Code, tcmPattern, status, severity, startYear, durationDays",
  },
];

export default function ExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (type: string, format: "csv" | "json") => {
    setDownloading(`${type}-${format}`);
    const res = await fetch(`/api/export/${type}?format=${format}`);
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Download failed");
      setDownloading(null);
      return;
    }
    if (format === "csv") {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ebtcm-${type}-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ebtcm-${type}-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloading(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/researcher" className="text-sm text-muted hover:text-foreground">← Researcher Hub</Link>
        <h1 className="text-xl font-bold text-foreground mt-1">Data Export Center</h1>
        <p className="text-sm text-muted mt-1">Download anonymised EBTCM datasets for your research. All exports are logged for transparency.</p>
      </div>

      <div className="rounded-xl border border-border bg-amber-50 p-4 mb-6 text-sm text-amber-800">
        <strong>Usage terms:</strong> Exported data is for non-commercial research purposes. Self-report data is from users who have provided explicit consent. Please cite EBTCM as your data source.
      </div>

      <div className="space-y-4">
        {DATASETS.map(({ type, icon, title, description, fields }) => (
          <div key={type} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start gap-4">
              <span className="text-3xl shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted mt-1">{description}</p>
                <p className="text-xs text-muted mt-2 font-mono bg-background border border-border rounded p-1.5 truncate">{fields}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => download(type, "csv")}
                  disabled={!!downloading}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-primary disabled:opacity-50 transition-colors"
                >
                  {downloading === `${type}-csv` ? "…" : "CSV"}
                </button>
                <button
                  onClick={() => download(type, "json")}
                  disabled={!!downloading}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
                >
                  {downloading === `${type}-json` ? "…" : "JSON"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
