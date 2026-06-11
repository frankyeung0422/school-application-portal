import * as React from 'react';
import { cn } from '@/lib/cn';
import { GlyphStar } from './glyph-star';
import { PALACE_NAMES, type PalaceName, type PlacedStar } from '@ziwei/engine';

export { PALACE_NAMES };
export type { PalaceName };
// Alias kept for components that imported the old name.
export type PalaceStar = PlacedStar;

interface PalaceCellProps extends React.HTMLAttributes<HTMLDivElement> {
  name: PalaceName;
  /** Earth branch label, e.g. 子, 丑, 寅 */
  branch?: string;
  /** Stem-branch combo for this palace, e.g. 甲子 */
  ganzhi?: string;
  /** Main stars present in this palace */
  stars?: PlacedStar[];
  /** Highlight as 命宮 / current 大限 / current 流年 etc. */
  highlight?: 'mingong' | 'period' | 'year' | 'none';
  /** When true, render placeholder (locked) state */
  locked?: boolean;
}

const highlightClass = {
  mingong: 'shadow-[var(--shadow-rim-strong),var(--shadow-glow-gold)]',
  period: 'shadow-[inset_0_0_0_1px_var(--color-vermilion)]',
  year: 'shadow-[inset_0_0_0_1px_var(--color-jade)]',
  none: 'shadow-[var(--shadow-rim-gold)]',
} as const;

export const PalaceCell = React.forwardRef<HTMLDivElement, PalaceCellProps>(
  ({ name, branch, ganzhi, stars = [], highlight = 'none', locked, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex flex-col p-3',
        'bg-[var(--color-bg-elevated)] rounded-[var(--radius)]',
        'min-h-[8rem]',
        highlightClass[highlight],
        locked && 'opacity-40 bg-gold-leaf',
        className,
      )}
      {...props}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-sm font-semibold text-[var(--color-gold-bright)]">
          {name}
        </span>
        {branch && (
          <span className="text-xs text-[var(--color-fg-subtle)] tracking-wide">{branch}</span>
        )}
      </div>
      {ganzhi && (
        <span className="mb-2 text-[0.65rem] text-[var(--color-fg-subtle)]">{ganzhi}</span>
      )}
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {stars.map((s) => (
          <GlyphStar
            key={s.name}
            name={s.name}
            brightness={s.brightness}
            transformation={s.transformation}
            size="sm"
          />
        ))}
      </div>
    </div>
  ),
);
PalaceCell.displayName = 'PalaceCell';
