'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * Generic anchored popover (Radix-based, sibling to `Dialog` but
 * positioned relative to its trigger instead of centered/modal). Radix's
 * own focus trap, Escape-to-close, click-outside-to-close, and close-focus
 * return to the trigger all apply with no extra plumbing here, since the
 * trigger is always the one fixed element passed in (unlike `Dialog`,
 * which documents why a dynamic trigger needs its own `onCloseAutoFocus`).
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'end',
  className,
}: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={8}
          className={cn(
            'z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-2 shadow-lg',
            className,
          )}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
