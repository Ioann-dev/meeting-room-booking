'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type RefObject } from 'react';
import type { CurrentUser } from 'shared';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api-error';
import { logout } from '@/lib/auth-client';

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: CurrentUser;
  onLoggedOut: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

const NAV_ITEMS = [{ href: '/schedule', label: 'Schedule' }] as const;

export function MobileNav({ open, onOpenChange, user, onLoggedOut, triggerRef }: MobileNavProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const { showToast } = useToast();

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      onOpenChange(false);
      onLoggedOut();
    } catch (error) {
      showToast(
        error instanceof ApiError
          ? error.messages.join(' ')
          : "Couldn't log out. Please try again.",
        'error',
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/40 md:hidden" />
        <RadixDialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 border-l border-border bg-surface p-6 md:hidden"
        >
          <div className="flex items-center justify-between">
            <RadixDialog.Title className="text-sm font-semibold text-ink">Menu</RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Close menu"
              className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
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

          <nav aria-label="Primary" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm',
                    active
                      ? 'font-semibold text-accent'
                      : 'font-medium text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <span
              aria-disabled="true"
              className="cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-ink-faint"
            >
              My Bookings
            </span>
          </nav>

          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-ink">{user.name}</p>
              {!user.emailVerified && <p className="text-xs text-warning">Email not verified</p>}
            </div>
            <Button
              type="button"
              variant="secondary"
              loading={loggingOut}
              onClick={() => void handleLogout()}
            >
              Log out
            </Button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
