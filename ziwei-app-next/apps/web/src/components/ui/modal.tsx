'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;
export const ModalPortal = Dialog.Portal;

export const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[var(--z-overlay)]',
      'bg-ink-wash',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      'backdrop-blur-sm',
      className,
    )}
    {...props}
  />
));
ModalOverlay.displayName = Dialog.Overlay.displayName;

export const ModalContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        'z-[var(--z-modal)] w-[min(92vw,32rem)] max-h-[90vh] overflow-auto',
        'bg-[var(--color-bg-elevated)] text-[var(--color-fg)]',
        'rounded-[var(--radius-lg)]',
        'shadow-[var(--shadow-rim-strong),var(--shadow-glow-gold)]',
        'p-8',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <Dialog.Close
          className={cn(
            'absolute right-4 top-4 size-8 inline-flex items-center justify-center',
            'rounded-[var(--radius)] text-[var(--color-fg-muted)]',
            'hover:text-[var(--color-gold-bright)] hover:bg-[var(--color-bg-deep)]',
            'transition-colors',
          )}
        >
          <X className="size-4" />
          <span className="sr-only">關閉</span>
        </Dialog.Close>
      )}
    </Dialog.Content>
  </ModalPortal>
));
ModalContent.displayName = Dialog.Content.displayName;

export const ModalHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4 flex flex-col gap-1', className)} {...p} />
);

export const ModalTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn('font-display text-2xl font-semibold text-[var(--color-gold-bright)]', className)}
    {...props}
  />
));
ModalTitle.displayName = Dialog.Title.displayName;

export const ModalDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn('text-sm text-[var(--color-fg-muted)]', className)}
    {...props}
  />
));
ModalDescription.displayName = Dialog.Description.displayName;
