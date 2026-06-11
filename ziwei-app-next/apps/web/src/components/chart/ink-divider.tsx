import * as React from 'react';
import { cn } from '@/lib/cn';

interface InkDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional centered label */
  children?: React.ReactNode;
  variant?: 'gold' | 'vermilion' | 'subtle';
}

const lineColor = {
  gold: 'before:bg-gradient-to-r after:bg-gradient-to-l before:from-transparent before:to-[var(--color-gold)] after:from-transparent after:to-[var(--color-gold)]',
  vermilion:
    'before:bg-gradient-to-r after:bg-gradient-to-l before:from-transparent before:to-[var(--color-vermilion)] after:from-transparent after:to-[var(--color-vermilion)]',
  subtle:
    'before:bg-gradient-to-r after:bg-gradient-to-l before:from-transparent before:to-[var(--color-fg-subtle)] after:from-transparent after:to-[var(--color-fg-subtle)]',
} as const;

export const InkDivider = ({ children, variant = 'gold', className, ...p }: InkDividerProps) => (
  <div
    className={cn(
      'flex items-center gap-4 my-6',
      "before:content-[''] before:h-px before:flex-1",
      "after:content-[''] after:h-px after:flex-1",
      lineColor[variant],
      className,
    )}
    {...p}
  >
    {children && (
      <span
        className={cn(
          'font-display text-sm tracking-widest uppercase',
          variant === 'gold' && 'text-[var(--color-gold)]',
          variant === 'vermilion' && 'text-[var(--color-vermilion)]',
          variant === 'subtle' && 'text-[var(--color-fg-subtle)]',
        )}
      >
        {children}
      </span>
    )}
  </div>
);
