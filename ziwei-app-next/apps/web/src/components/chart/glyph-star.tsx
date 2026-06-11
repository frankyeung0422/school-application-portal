import * as React from 'react';
import { cn } from '@/lib/cn';
import {
  MAIN_STARS,
  AUX_STARS,
  type StarName,
  type MainStar,
  type AuxStar,
  type StarBrightness,
} from '@ziwei/engine';

// Re-export from engine for downstream consumers.
export { MAIN_STARS, AUX_STARS };
export type { StarName, MainStar, AuxStar, StarBrightness };

interface GlyphStarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: StarName;
  brightness?: StarBrightness;
  size?: 'sm' | 'md' | 'lg';
  /** Optional 化 transformation badge: 祿 | 權 | 科 | 忌 */
  transformation?: '祿' | '權' | '科' | '忌';
}

const sizeClass = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
} as const;

const transformationClass = {
  祿: 'text-[var(--color-jade)]',
  權: 'text-[var(--color-gold-bright)]',
  科: 'text-[var(--color-info)]',
  忌: 'text-[var(--color-vermilion)]',
} as const;

/**
 * GlyphStar renders one of the 紫微斗數 stars with its brightness and
 * optional 四化 transformation badge.
 */
export const GlyphStar = React.forwardRef<HTMLSpanElement, GlyphStarProps>(
  ({ name, brightness, size = 'md', transformation, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-baseline gap-1 font-display',
        'text-[var(--color-fg)]',
        sizeClass[size],
        className,
      )}
      title={brightness ? `${name} ${brightness}` : name}
      {...props}
    >
      <span className="font-semibold">{name}</span>
      {brightness && (
        <span className="text-[0.65em] text-[var(--color-fg-subtle)] tracking-wider">
          {brightness}
        </span>
      )}
      {transformation && (
        <span
          className={cn(
            'inline-flex items-center justify-center',
            'size-[1.1em] rounded-full text-[0.6em] font-semibold',
            'ring-1 ring-current',
            transformationClass[transformation],
          )}
          aria-label={`化${transformation}`}
        >
          {transformation}
        </span>
      )}
    </span>
  ),
);
GlyphStar.displayName = 'GlyphStar';
