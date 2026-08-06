'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  /**
   * Radix's own default close-focus (return to whatever was focused before
   * the dialog opened) does not reliably land back on the trigger once the
   * trigger isn't a fixed, single `Dialog.Trigger` element -- MobileNav hits
   * the same gap and works around it with its own explicit ref + preventDefault.
   * Callers with a dynamic trigger (e.g. one of many list-item buttons)
   * should do the same here.
   */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * Generic accessible dialog (focus trap, Escape-to-close via Radix). Used
 * for confirmations; also the base MobileNav builds its sheet variant on
 * top of the same @radix-ui/react-dialog primitives.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  onCloseAutoFocus,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <RadixDialog.Content
          aria-modal="true"
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            'fixed z-50 border border-border bg-surface p-6 shadow-md',
            // Below sm: bottom sheet -- full width, anchored to the
            // bottom edge, capped height with its own scroll so content
            // (e.g. the booking form's full field stack) can never push
            // past the viewport. No enter/exit animation: Radix unmounts
            // Content immediately on close (no forceMount), so animating
            // the close transition would need Presence-aware exit
            // handling -- a bigger change to a primitive with existing
            // focus-return coverage that isn't worth the risk for
            // "nonessential" motion this late in the roadmap.
            'inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-lg',
            // sm and up: the original centered dialog, unchanged.
            'sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:max-h-none sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-visible sm:rounded-lg',
            className,
          )}
        >
          <RadixDialog.Title className="text-base font-semibold text-ink">
            {title}
          </RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="mt-1 text-sm text-ink-subtle">
              {description}
            </RadixDialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
