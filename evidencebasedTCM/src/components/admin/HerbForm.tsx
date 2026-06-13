"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NATURES = ["WARM", "HOT", "COOL", "COLD", "NEUTRAL"];
const CATEGORIES = [
  "Qi Tonifying", "Blood Tonifying", "Yin Tonifying", "Yang Tonifying",
  "Exterior Releasing", "Heat Clearing", "Purgative", "Wind-Dampness Dispelling",
  "Dampness Draining", "Phlegm Resolving", "Qi Regulating", "Blood Invigorating",
  "Hemostatic", "Food Stagnation Relieving", "Aromatic Dampness Transforming",
  "Interior Warming", "Spirit Calming", "Liver Wind Extinguishing",
  "Orifice Opening", "Astringent", "Parasite Expelling", "Topical",
];
const FLAVORS = ["Sweet", "Bitter", "Acrid", "Sour", "Salty", "Bland", "Astringent"];
const MERIDIANS = [
  "Lung", "Large Intestine", "Stomach", "Spleen", "Heart", "Small Intestine",
  "Bladder", "Kidney", "Pericardium", "San Jiao", "Gallbladder", "Liver",
];

interface HerbFormData {
  id?: string;
  pinyinName: string;
  chineseName: string;
  latinName: string;
  englishName: string;
  category: string;
  nature: string;
  flavor: string[];
  meridianTropism: string[];
  dosageRange: string;
  description: string;
  modernPharmacology: string;
  status: string;
}

interface HerbFormProps {
  initialData?: HerbFormData;
  mode: "create" | "edit";
}

export function HerbForm({ initialData, mode }: HerbFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<HerbFormData>(
    initialData || {
      pinyinName: "",
      chineseName: "",
      latinName: "",
      englishName: "",
      category: CATEGORIES[0],
      nature: "NEUTRAL",
      flavor: [],
      meridianTropism: [],
      dosageRange: "",
      description: "",
      modernPharmacology: "",
      status: "DRAFT",
    }
  );

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: "flavor" | "meridianTropism", item: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((v) => v !== item)
        : [...prev[field], item],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = mode === "create" ? "/api/admin/herb" : `/api/admin/herb/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      router.push("/admin/herbs");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Pinyin Name *</label>
          <input
            type="text"
            required
            value={form.pinyinName}
            onChange={(e) => updateField("pinyinName", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Chinese Name *</label>
          <input
            type="text"
            required
            value={form.chineseName}
            onChange={(e) => updateField("chineseName", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Latin Name</label>
          <input
            type="text"
            value={form.latinName}
            onChange={(e) => updateField("latinName", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">English Name</label>
          <input
            type="text"
            value={form.englishName}
            onChange={(e) => updateField("englishName", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Category *</label>
          <select
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nature *</label>
          <select
            value={form.nature}
            onChange={(e) => updateField("nature", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          >
            {NATURES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Dosage Range</label>
          <input
            type="text"
            value={form.dosageRange}
            onChange={(e) => updateField("dosageRange", e.target.value)}
            placeholder="e.g. 9-30g"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Flavors</label>
        <div className="flex flex-wrap gap-2">
          {FLAVORS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleArrayItem("flavor", f)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                form.flavor.includes(f)
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-muted border-border hover:border-primary-light"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Meridian Tropism</label>
        <div className="flex flex-wrap gap-2">
          {MERIDIANS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleArrayItem("meridianTropism", m)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                form.meridianTropism.includes(m)
                  ? "bg-accent text-white border-accent"
                  : "bg-surface text-muted border-border hover:border-accent"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Modern Pharmacology</label>
        <textarea
          value={form.modernPharmacology}
          onChange={(e) => updateField("modernPharmacology", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Status</label>
        <select
          value={form.status}
          onChange={(e) => updateField("status", e.target.value)}
          className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : mode === "create" ? "Create Herb" : "Update Herb"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border px-6 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
