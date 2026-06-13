"use client";

import { useState, type ReactNode } from "react";
import { BodyMap, type BodyMapPoint } from "./BodyMap";

interface Props {
  listSlot: ReactNode;
  points: BodyMapPoint[];
  locale: "zh-Hant" | "en";
  labels: {
    listView: string;
    bodyView: string;
    front: string;
    back: string;
    allMeridians: string;
    clickHint: string;
    noMapping: string;
  };
}

export function AcupointViewToggle({ listSlot, points, locale, labels }: Props) {
  const [mode, setMode] = useState<"list" | "body">("list");
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setMode("list")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "list" ? "bg-primary text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {labels.listView}
        </button>
        <button
          type="button"
          onClick={() => setMode("body")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "body" ? "bg-primary text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {labels.bodyView}
        </button>
      </div>

      {mode === "list" ? (
        listSlot
      ) : (
        <BodyMap
          points={points}
          locale={locale}
          labels={{
            front: labels.front,
            back: labels.back,
            allMeridians: labels.allMeridians,
            clickHint: labels.clickHint,
            noMapping: labels.noMapping,
          }}
        />
      )}
    </div>
  );
}
