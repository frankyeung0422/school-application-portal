"use client";

import { useState } from "react";
import Link from "next/link";

interface SearchResult {
  courseId: string;
  courseName: string;
  lessonNum: number;
  title: string;
  category: string | null;
  snippet: string;
}

export function CourseSearch({ locale }: { locale: "zh-Hant" | "en" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/learn/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={S("搜尋課程內容（中藥名、方劑名、症狀、理論…）", "Search course content (herb, formula, symptom, theory...)")}
          className="w-full rounded-lg border border-border bg-surface py-2.5 px-4 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
        {loading && (
          <span className="absolute right-3 top-3 text-xs text-muted animate-pulse">...</span>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-surface divide-y divide-border max-h-96 overflow-auto">
          {results.map((r, i) => (
            <Link
              key={`${r.courseId}-${r.lessonNum}-${i}`}
              href={`/learn/${r.courseId}/${r.lessonNum}`}
              className="block p-3 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-primary">{r.courseName}</span>
                <span className="text-xs text-muted">#{r.lessonNum}</span>
                {r.category && (
                  <span className="text-[10px] rounded bg-primary/10 text-primary px-1.5 py-0.5">{r.category}</span>
                )}
              </div>
              <p className="text-sm font-medium mb-0.5">{r.title}</p>
              <p className="text-xs text-muted line-clamp-2">{r.snippet}</p>
            </Link>
          ))}
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <p className="mt-2 text-xs text-muted">
          {S("未找到相關內容。", "No results found.")}
        </p>
      )}
    </div>
  );
}
