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
  /**
   * Opt-in, not default-on: a purely informational/read-only dialog (e.g.
   * viewing another attendee's booking) can render zero action buttons,
   * leaving Escape/backdrop-click as the only way out -- both work, but
   * neither is visible. A dialog whose content already offers an explicit
   * primary action (create, confirm/keep) doesn't need a second, redundant
   * close affordance, so existing callers stay unchanged unless they ask
   * for this. Uses the same RadixDialog.Close mechanism as Escape, so it
   * carries no new close behavior of its own -- only a discoverable,
   * keyboard-reachable trigger for what already exists.
   */
  showCloseButton?: boolean;
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
  showCloseButton = false,
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
            'inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-xl',
            // sm and up: the original centered dialog, unchanged. max-w
            // widened from the default `md` (28rem/448px) to a fixed
            // 520px -- within the 500-540px premium-dialog width band --
            // and rounded-xl (16px) rather than rounded-lg (12px) to match
            // the rest of the elevated-surface radius scale.
            'sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-none sm:w-[calc(100%-2rem)] sm:max-w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-visible sm:rounded-xl',
            className,
          )}
        >
          {showCloseButton ? (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <RadixDialog.Title className="text-base font-semibold text-ink">
                  {title}
                </RadixDialog.Title>
                {description && (
                  <RadixDialog.Description className="mt-1 text-sm text-ink-subtle">
                    {description}
                  </RadixDialog.Description>
                )}
              </div>
              {/* Same RadixDialog.Close + icon pattern MobileNav already uses
                  for its sheet variant -- kept visually and behaviorally
                  identical rather than introducing a second close-button
                  style. h-11/w-11 below md: matches this app's established
                  touch-target bar (see Button/Input), md:h-9/w-9 restores
                  the current desktop density. */}
              <RadixDialog.Close
                aria-label="Close"
                className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink md:h-9 md:w-9"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                  <path
                    d="m5 5 10 10M15 5 5 15"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </RadixDialog.Close>
            </div>
          ) : (
            <>
              <RadixDialog.Title className="text-base font-semibold text-ink">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-sm text-ink-subtle">
                  {description}
                </RadixDialog.Description>
              )}
            </>
          )}
          <div className="mt-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
