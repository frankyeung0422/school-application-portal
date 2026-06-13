"use client";

import { useState } from "react";
import { lookup } from "@/lib/i18n/tcm-glossary";

interface Props {
  term: string;
  locale: "zh-Hant" | "en";
  className?: string;
  children?: React.ReactNode; // optional override of display text
}

/**
 * Wraps a Chinese TCM term. In zh-Hant: just renders the term. In en:
 * renders the term with a dotted underline; click/hover reveals a popover
 * with the English gloss + plain-language explanation.
 *
 * If the term isn't in the curated glossary, it falls back to plain text
 * (no underline, no popover) — never misleads.
 */
export function TermPopover({ term, locale, className = "", children }: Props) {
  const [open, setOpen] = useState(false);
  const entry = lookup(term);
  const isZh = locale === "zh-Hant";

  if (isZh || !entry) {
    return <span className={className}>{children ?? term}</span>;
  }

  return (
    <span className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="cursor-help border-b border-dotted border-primary/60 hover:border-primary"
      >
        {children ?? term}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-72 rounded-md border border-border bg-background shadow-lg p-3 text-left"
        >
          <span className="block text-xs font-semibold text-primary">
            {entry.english} <span className="text-muted font-normal">({entry.pinyin})</span>
          </span>
          <span className="block text-xs text-foreground mt-1 leading-relaxed">{entry.description}</span>
        </span>
      )}
    </span>
  );
}
