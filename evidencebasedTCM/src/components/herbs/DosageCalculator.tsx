"use client";

import { useMemo, useState } from "react";

interface Props {
  dosageRange?: string | null;
  herbName: string;
  labels: {
    title: string;
    adultWeight: string;
    pediatricWeight: string;
    decoction: string;
    powder: string;
    frequency: string;
    recommended: string;
    daily: string;
    pediatricNote: string;
    safetyNote: string;
  };
}

// Parse simple "3–9 g" / "6-15g" patterns, returning min/max grams.
function parseRange(input?: string | null): [number, number] | null {
  if (!input) return null;
  const m = input.match(/(\d+(?:\.\d+)?)\s*[–\-~至到]\s*(\d+(?:\.\d+)?)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  const single = input.match(/(\d+(?:\.\d+)?)\s*g/);
  if (single) return [parseFloat(single[1]) / 2, parseFloat(single[1])];
  return null;
}

// Clark's rule approximation for pediatric scaling.
function pediatricScale(weightKg: number): number {
  // Treat 70 kg as reference adult.
  return Math.max(0.1, Math.min(1, weightKg / 70));
}

export function DosageCalculator({ dosageRange, herbName, labels }: Props) {
  const [adultWeight, setAdultWeight] = useState(60);
  const [pediatricWeight, setPediatricWeight] = useState(20);
  const [freq, setFreq] = useState<1 | 2 | 3>(2);
  const [form, setForm] = useState<"decoction" | "powder">("decoction");

  const range = useMemo(() => parseRange(dosageRange), [dosageRange]);

  if (!range) {
    return (
      <div className="rounded-lg border border-border p-4 bg-surface text-sm text-muted">
        {labels.title}: —
      </div>
    );
  }

  const [lo, hi] = range;
  // Adjust by weight: reference adult weight 60kg → scale linearly to entered weight, cap 1.3×
  const adultScale = Math.max(0.6, Math.min(1.3, adultWeight / 60));
  const adultLo = +(lo * adultScale).toFixed(1);
  const adultHi = +(hi * adultScale).toFixed(1);
  const pedScale = pediatricScale(pediatricWeight);
  const pedLo = +(lo * pedScale).toFixed(1);
  const pedHi = +(hi * pedScale).toFixed(1);
  // Powder form is typically 1/3 of decoction dose
  const formScale = form === "powder" ? 1 / 3 : 1;
  const dailyAdult = `${(adultLo * formScale).toFixed(1)}–${(adultHi * formScale).toFixed(1)} g`;
  const dailyPed = `${(pedLo * formScale).toFixed(1)}–${(pedHi * formScale).toFixed(1)} g`;
  const perDoseAdult = `${((adultLo * formScale) / freq).toFixed(1)}–${((adultHi * formScale) / freq).toFixed(1)} g`;

  return (
    <div className="rounded-lg border border-border p-4 bg-surface space-y-3">
      <h3 className="text-sm font-semibold">{labels.title} · {herbName}</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="text-muted">{labels.adultWeight}</span>
          <input
            type="number"
            min={30}
            max={150}
            value={adultWeight}
            onChange={(e) => setAdultWeight(parseInt(e.target.value) || 60)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted">{labels.pediatricWeight}</span>
          <input
            type="number"
            min={3}
            max={60}
            value={pediatricWeight}
            onChange={(e) => setPediatricWeight(parseInt(e.target.value) || 20)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1"
          />
        </label>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setForm("decoction")}
            className={`px-2 py-1 ${form === "decoction" ? "bg-primary text-white" : "text-muted"}`}
          >
            {labels.decoction}
          </button>
          <button
            type="button"
            onClick={() => setForm("powder")}
            className={`px-2 py-1 ${form === "powder" ? "bg-primary text-white" : "text-muted"}`}
          >
            {labels.powder}
          </button>
        </div>
        <label className="ml-auto flex items-center gap-2">
          <span className="text-muted">{labels.frequency}</span>
          <select
            value={freq}
            onChange={(e) => setFreq(parseInt(e.target.value) as 1 | 2 | 3)}
            className="rounded border border-border bg-background px-2 py-1"
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={3}>3×</option>
          </select>
        </label>
      </div>

      <div className="rounded-md bg-primary/5 p-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted">{labels.recommended}</span>
          <span className="font-mono">{lo}–{hi} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">{labels.daily} · adult</span>
          <span className="font-mono font-semibold">{dailyAdult}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">per dose · {freq}×/d</span>
          <span className="font-mono">{perDoseAdult}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">{labels.daily} · pediatric ({pediatricWeight}kg)</span>
          <span className="font-mono">{dailyPed}</span>
        </div>
      </div>

      <p className="text-xs text-muted">{labels.pediatricNote}</p>
      <p className="text-xs text-red-700/80">{labels.safetyNote}</p>
    </div>
  );
}
