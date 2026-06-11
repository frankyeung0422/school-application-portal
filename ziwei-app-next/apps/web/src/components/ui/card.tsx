import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const cardVariants = cva(
  [
    'relative overflow-hidden',
    'transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]',
  ],
  {
    variants: {
      variant: {
        ink: [
          'bg-[var(--color-bg-elevated)] text-[var(--color-fg)]',
          'shadow-[var(--shadow-rim-gold)] rounded-[var(--radius-lg)]',
        ],
        paper: [
          'bg-[var(--color-paper)] text-[var(--color-paper-ink)]',
          'rounded-[var(--radius-lg)] ring-1 ring-[var(--color-border-paper)]',
        ],
        'gold-rim': [
          'bg-[var(--color-bg-elevated)] text-[var(--color-fg)]',
          'rounded-[var(--radius-lg)]',
          'shadow-[var(--shadow-rim-strong),var(--shadow-glow-gold)]',
        ],
        plain: 'bg-transparent text-[var(--color-fg)]',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-12',
      },
    },
    defaultVariants: { variant: 'ink', padding: 'md' },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding, className }))} {...props} />
  ),
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4 flex flex-col gap-1', className)} {...p} />
);

export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-display text-xl font-semibold text-[var(--color-gold-bright)]', className)} {...p} />
);

export const CardDescription = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-[var(--color-fg-muted)]', className)} {...p} />
);

export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('text-[var(--color-fg)]', className)} {...p} />
);

export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-6 flex items-center gap-3', className)} {...p} />
);
