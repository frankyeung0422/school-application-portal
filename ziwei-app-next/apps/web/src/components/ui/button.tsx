import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-display font-medium tracking-wide',
    'transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]',
    'focus-visible:outline-2 focus-visible:outline-[var(--color-gold)] focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--color-gold)] text-[var(--color-bg-deep)]',
          'shadow-[var(--shadow-rim-gold)]',
          'hover:bg-[var(--color-gold-bright)] hover:shadow-[var(--shadow-glow-gold)] hover:-translate-y-[1px]',
          'active:translate-y-0',
        ],
        gold: [
          'bg-gradient-to-b from-[var(--color-gold-bright)] via-[var(--color-gold)] to-[var(--color-gold-dim)]',
          'text-[var(--color-bg-deep)] font-semibold',
          'shadow-[var(--shadow-glow-gold)]',
          'hover:from-[var(--color-gold-foil)] hover:-translate-y-[1px]',
        ],
        ghost: [
          'bg-transparent text-[var(--color-fg)]',
          'shadow-[var(--shadow-rim-gold)]',
          'hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-gold-bright)]',
        ],
        link: [
          'bg-transparent text-[var(--color-gold)] underline-offset-4',
          'hover:underline hover:text-[var(--color-gold-bright)]',
          'shadow-none',
        ],
        danger: [
          'bg-[var(--color-danger)] text-[var(--color-fg)]',
          'hover:opacity-90',
        ],
        ink: [
          'bg-[var(--color-bg-elevated)] text-[var(--color-fg)]',
          'shadow-[var(--shadow-rim-gold)]',
          'hover:bg-[var(--color-bg-deep)] hover:text-[var(--color-gold)]',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-[var(--radius)]',
        md: 'h-10 px-5 text-sm rounded-[var(--radius)]',
        lg: 'h-12 px-7 text-base rounded-[var(--radius-lg)]',
        xl: 'h-14 px-9 text-lg rounded-[var(--radius-lg)]',
        icon: 'size-10 rounded-[var(--radius)]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
