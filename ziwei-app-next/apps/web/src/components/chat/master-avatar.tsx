'use client';

import { useState } from 'react';

export type MasterState = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATE_LABEL: Record<MasterState, string> = {
  idle: '師傅在此',
  listening: '師傅聆聽中…',
  thinking: '師傅閱您命盤…',
  speaking: '師傅論命中…',
};

/**
 * Presentational talking-portrait avatar. A single AI-generated portrait with
 * an audio-reactive gold aura: when `state==='speaking'`, `level` (0..1, the
 * live audio amplitude computed by VoiceMaster) drives the glow + a subtle
 * scale so the master visibly "speaks". Other states use ambient animations.
 * Falls back to a styled monogram if the portrait asset is missing.
 */
export function MasterAvatar({
  state,
  level,
  size = 200,
  src = '/master/master.png',
}: {
  state: MasterState;
  level: number;
  size?: number;
  src?: string;
}) {
  const [imgOk, setImgOk] = useState(true);

  // Glow strength: amplitude-driven while speaking, gentle pulse while listening.
  const speaking = state === 'speaking';
  const glow = speaking ? 0.35 + level * 0.65 : state === 'listening' ? 0.5 : 0.25;
  const scale = speaking ? 1 + level * 0.04 : 1;
  const ringColor =
    state === 'listening' ? 'var(--color-vermilion, #c0392b)' : 'var(--color-gold, #c9a227)';

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div
        className="relative rounded-full"
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 ${12 + glow * 48}px ${glow * 10}px color-mix(in srgb, ${ringColor} ${Math.round(
            glow * 70,
          )}%, transparent)`,
          transition: 'box-shadow 80ms linear',
        }}
      >
        {/* rotating aura ring */}
        <div
          aria-hidden
          className="absolute inset-[-6px] rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${ringColor}, transparent)`,
            opacity: state === 'idle' ? 0.25 : 0.6,
            animation: `mv-spin ${state === 'thinking' ? 3 : 8}s linear infinite`,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))',
          }}
        />
        <div
          className="absolute inset-0 rounded-full overflow-hidden bg-[var(--color-bg-deep)] shadow-[var(--shadow-rim-gold)]"
          style={{ transform: `scale(${scale})`, transition: 'transform 80ms linear' }}
        >
          {imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt="命理師傅"
              width={size}
              height={size}
              className="w-full h-full object-cover"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display text-5xl text-gold-foil">
              師
            </div>
          )}
        </div>
        {/* breathing veil while idle/thinking */}
        {(state === 'idle' || state === 'thinking') && (
          <div
            aria-hidden
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ animation: 'mv-breathe 4s ease-in-out infinite', background: 'transparent' }}
          />
        )}
      </div>

      <p className="text-xs tracking-widest text-[var(--color-fg-muted)]">{STATE_LABEL[state]}</p>

      {/* speaking equalizer */}
      <div className="flex items-end gap-1 h-4" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => {
          const h = speaking ? 4 + Math.min(16, level * 20 * (1 + ((i % 3) * 0.3))) : 3;
          return (
            <span
              key={i}
              className="w-1 rounded-full bg-[var(--color-gold)]"
              style={{ height: h, transition: 'height 90ms linear', opacity: speaking ? 0.9 : 0.3 }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes mv-spin { to { transform: rotate(360deg); } }
        @keyframes mv-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.012); } }
      `}</style>
    </div>
  );
}
