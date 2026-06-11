import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full',
        'rounded-[var(--radius)] px-4 py-2',
        'bg-[var(--color-bg-deep)] text-[var(--color-fg)]',
        'shadow-[var(--shadow-rim-gold)]',
        'placeholder:text-[var(--color-fg-subtle)]',
        'transition-shadow duration-[var(--duration-fast)]',
        'focus:outline-none focus:shadow-[var(--shadow-rim-strong),var(--shadow-glow-gold)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium text-[var(--color-fg-muted)]',
        'leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
}

export const Field = ({ label, hint, error, htmlFor, className, children, ...p }: FieldProps) => (
  <div className={cn('flex flex-col gap-2', className)} {...p}>
    {label && <Label htmlFor={htmlFor}>{label}</Label>}
    {children}
    {hint && !error && <p className="text-xs text-[var(--color-fg-subtle)]">{hint}</p>}
    {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
  </div>
);
