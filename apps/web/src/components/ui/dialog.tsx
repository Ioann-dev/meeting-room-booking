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
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-md',
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
