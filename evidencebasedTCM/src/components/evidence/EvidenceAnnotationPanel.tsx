"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

type Author = { institution: string | null; verificationStatus: string; user: { name: string | null } };
type Annotation = {
  id: string;
  body: string;
  annotationType: string;
  upvotes: number;
  createdAt: string;
  author: Author;
  replies: Annotation[];
};

const TYPE_LABEL: Record<string, string> = {
  COMMENT: "Comment",
  CRITIQUE: "Critique",
  METHODOLOGY_NOTE: "Methodology Note",
  CLINICAL_NOTE: "Clinical Note",
};
const TYPE_COLOR: Record<string, string> = {
  COMMENT: "bg-blue-50 text-blue-700 border-blue-200",
  CRITIQUE: "bg-red-50 text-red-700 border-red-200",
  METHODOLOGY_NOTE: "bg-purple-50 text-purple-700 border-purple-200",
  CLINICAL_NOTE: "bg-green-50 text-green-700 border-green-200",
};

function AnnotationCard({ ann, evidenceId, onReply, onUpvote, depth = 0 }: {
  ann: Annotation; evidenceId: string; onReply: (parentId: string) => void;
  onUpvote: (id: string) => void; depth?: number;
}) {
  return (
    <div className={`${depth > 0 ? "ml-6 border-l border-border pl-4" : ""}`}>
      <div className="rounded-lg border border-border bg-surface p-4 mb-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${TYPE_COLOR[ann.annotationType] ?? "bg-muted/20 text-muted border-border"}`}>
              {TYPE_LABEL[ann.annotationType] ?? ann.annotationType}
            </span>
            <span className="text-sm font-medium text-foreground">{ann.author.user.name ?? "Anonymous"}</span>
            {ann.author.verificationStatus === "VERIFIED" && (
              <span className="text-xs text-green-600 font-medium">✓ Verified</span>
            )}
            {ann.author.institution && (
              <span className="text-xs text-muted">{ann.author.institution}</span>
            )}
          </div>
          <span className="text-xs text-muted shrink-0">
            {new Date(ann.createdAt).toLocaleDateString("en-HK", { year: "numeric", month: "short", day: "numeric" })}
          </span>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{ann.body}</p>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => onUpvote(ann.id)}
            className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors">
            ▲ <span>{ann.upvotes}</span>
          </button>
          {depth === 0 && (
            <button onClick={() => onReply(ann.id)}
              className="text-xs text-muted hover:text-foreground transition-colors">
              Reply
            </button>
          )}
        </div>
      </div>
      {ann.replies?.map(r => (
        <AnnotationCard key={r.id} ann={r} evidenceId={evidenceId} onReply={onReply} onUpvote={onUpvote} depth={depth + 1} />
      ))}
    </div>
  );
}

export function EvidenceAnnotationPanel({ evidenceId }: { evidenceId: string }) {
  const { data: session } = useSession();
  const user = session?.user as { role?: string } | undefined;
  const canAnnotate = user?.role === "RESEARCHER" || user?.role === "ADMIN" || user?.role === "EDITOR";

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [form, setForm] = useState({ body: "", annotationType: "COMMENT" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAnnotations = useCallback(async () => {
    const res = await fetch(`/api/evidence/${evidenceId}/annotations`);
    if (res.ok) setAnnotations(await res.json());
    setLoading(false);
  }, [evidenceId]);

  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.body.trim()) { setError("Annotation body required"); return; }
    setSaving(true); setError("");
    const res = await fetch(`/api/evidence/${evidenceId}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: form.body, annotationType: form.annotationType, parentId: replyTo }),
    });
    if (res.ok) {
      setForm({ body: "", annotationType: "COMMENT" });
      setShowForm(false);
      setReplyTo(null);
      fetchAnnotations();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to post");
    }
    setSaving(false);
  };

  const handleUpvote = async (id: string) => {
    await fetch(`/api/evidence/${evidenceId}/annotations/${id}/upvote`, { method: "POST" });
    fetchAnnotations();
  };

  const totalCount = annotations.reduce((n, a) => n + 1 + (a.replies?.length ?? 0), 0);

  return (
    <div className="mt-8 border-t border-border pt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Researcher Annotations
          {totalCount > 0 && <span className="ml-2 text-sm font-normal text-muted">({totalCount})</span>}
        </h3>
        {canAnnotate && !showForm && (
          <button onClick={() => { setShowForm(true); setReplyTo(null); }}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
            + Add Annotation
          </button>
        )}
        {!canAnnotate && !session && (
          <p className="text-xs text-muted">
            <a href="/register?role=RESEARCHER" className="text-primary hover:underline">Sign up as a researcher</a> to annotate.
          </p>
        )}
      </div>

      {(showForm || replyTo) && (
        <form onSubmit={handleSubmit} className="mb-4 rounded-xl border border-border bg-surface p-4 space-y-3">
          <h4 className="text-sm font-medium">{replyTo ? "Reply to annotation" : "New Annotation"}</h4>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {!replyTo && (
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select value={form.annotationType} onChange={e => setForm(f => ({ ...f, annotationType: e.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={4} placeholder="Share your expert insight, critique, or clinical observation..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {saving ? "Posting…" : "Post"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setReplyTo(null); }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading annotations…</p>
      ) : annotations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted text-sm">No annotations yet.</p>
          {canAnnotate && (
            <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-primary hover:underline">
              Be the first to annotate this study
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {annotations.map(ann => (
            <AnnotationCard
              key={ann.id}
              ann={ann}
              evidenceId={evidenceId}
              onReply={(parentId) => { setReplyTo(parentId); setShowForm(false); }}
              onUpvote={handleUpvote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
