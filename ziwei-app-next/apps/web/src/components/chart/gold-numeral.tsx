import * as React from 'react';
import { cn } from '@/lib/cn';

interface GoldNumeralProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | string;
  prefix?: string;
  suffix?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'display';
  /** When true, use the foil gradient. Otherwise solid brushed gold. */
  foil?: boolean;
}

const sizeClass = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
  display: 'text-6xl',
} as const;

/**
 * Display a number (price, percentage, count, year) in brushed gold.
 * Used for pricing anchors, streak counters, and report stat highlights.
 */
export const GoldNumeral = ({
  value,
  prefix,
  suffix,
  size = 'md',
  foil = false,
  className,
  ...props
}: GoldNumeralProps) => (
  <span
    className={cn(
      'inline-flex items-baseline gap-1 font-display font-semibold tabular-nums',
      foil ? 'text-gold-foil' : 'text-[var(--color-gold-bright)]',
      sizeClass[size],
      className,
    )}
    {...props}
  >
    {prefix && <span className="text-[0.65em] opacity-80">{prefix}</span>}
    <span>{value}</span>
    {suffix && <span className="text-[0.55em] opacity-70">{suffix}</span>}
  </span>
);
