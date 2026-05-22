'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

export interface ShareArchetypeProps {
  chartHash: string;
  archetype: { label: string; tagline: string; traits: [string, string, string] };
}

/**
 * Compact share dropdown that opens a panel with a preview of the archetype
 * OG card, copy-link, and per-channel share intents (FB / WhatsApp / IG via
 * download). The card itself is rendered server-side at /api/og/archetype.
 */
export function ShareArchetype({ chartHash, archetype }: ShareArchetypeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const cardParams = new URLSearchParams({
    h: chartHash,
    n: archetype.label,
    t: archetype.tagline,
    a: archetype.traits.join('|'),
  });
  const cardUrl = typeof window === 'undefined'
    ? `/api/og/archetype?${cardParams.toString()}`
    : `${window.location.origin}/api/og/archetype?${cardParams.toString()}`;

  const shareText = `我的紫微命格: ${archetype.label} — ${archetype.tagline}`;
  const pageUrl = typeof window === 'undefined' ? '' : window.location.origin;
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(shareText)}`;
  const waShare = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${pageUrl}`)}`;
  const twShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${pageUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore — clipboard API can fail in non-secure contexts
    }
  }

  return (
    <div className="relative inline-block">
      <Button variant="gold" size="sm" onClick={() => setOpen((o) => !o)}>
        {archetype.label} · 分享
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] z-20 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-rim-strong),var(--shadow-glow-gold)] p-4">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-1">分享您的命格</p>
            <p className="text-xs text-[var(--color-fg-muted)]">朋友看到分享卡, 點擊即可免費生成自己的命盤。</p>
          </div>

          {/* Card preview */}
          <a
            href={cardUrl}
            target="_blank"
            rel="noreferrer"
            className="block mb-3 rounded-[var(--radius)] overflow-hidden shadow-[var(--shadow-rim-gold)] aspect-[4/5] bg-[var(--color-bg-deep)]"
          >
            <img src={cardUrl} alt={archetype.label} className="w-full h-full object-cover" />
          </a>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <a href={waShare} target="_blank" rel="noreferrer" className="text-xs text-center py-2 rounded-[var(--radius)] bg-[var(--color-bg-deep)] text-[var(--color-fg)] hover:text-[var(--color-gold-bright)]">WhatsApp</a>
            <a href={fbShare} target="_blank" rel="noreferrer" className="text-xs text-center py-2 rounded-[var(--radius)] bg-[var(--color-bg-deep)] text-[var(--color-fg)] hover:text-[var(--color-gold-bright)]">Facebook</a>
            <a href={twShare} target="_blank" rel="noreferrer" className="text-xs text-center py-2 rounded-[var(--radius)] bg-[var(--color-bg-deep)] text-[var(--color-fg)] hover:text-[var(--color-gold-bright)]">X / Twitter</a>
            <a href={cardUrl} download={`${archetype.label}.png`} className="text-xs text-center py-2 rounded-[var(--radius)] bg-[var(--color-bg-deep)] text-[var(--color-fg)] hover:text-[var(--color-gold-bright)]">下載卡片</a>
          </div>

          <button
            type="button"
            onClick={copyLink}
            className="w-full text-xs py-2 rounded-[var(--radius)] bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)] hover:bg-[var(--color-gold)]/20 transition-colors"
          >
            {copied ? '已複製 ✓' : '複製文字 + 連結'}
          </button>
        </div>
      )}
    </div>
  );
}
