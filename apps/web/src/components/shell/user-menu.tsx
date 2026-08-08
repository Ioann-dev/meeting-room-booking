'use client';

import { useState } from 'react';
import type { CurrentUser } from 'shared';
import { Popover } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-error';
import { logout } from '@/lib/auth-client';

interface UserMenuProps {
  user: CurrentUser;
  onLoggedOut: () => void;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * The identity/logout cluster as a small account popover (name, email-
 * verification state, then Log out) rather than the name and Log out
 * button both sitting exposed in the header bar -- reads as a real
 * application's account menu instead of two independent utility controls
 * that happen to be next to each other.
 */
export function UserMenu({ user, onLoggedOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { showToast } = useToast();

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
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
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      // `!w-64`, not a bare `w-64` -- Popover's own base classes already
      // set `w-[360px]` (right for the notification list it was designed
      // around), and cn() has no tailwind-merge conflict resolution, so
      // an unmarked override here would compete with that base class by
      // Tailwind's generated-CSS source order rather than reliably win.
      // The important modifier makes it deterministic (same technique
      // this file already uses below for the logout button's hover).
      className="!w-64"
      trigger={
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Account menu, ${user.name}`}
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors duration-150 ease-premium hover:bg-surface-hover"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-xs font-semibold text-accent-strong"
          >
            {initials(user.name)}
          </span>
          <span className="hidden max-w-32 truncate text-sm font-medium text-ink sm:block">
            {user.name}
          </span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="hidden h-3.5 w-3.5 shrink-0 text-ink-faint sm:block"
          >
            <path
              d="m4.5 6.5 3.5 3.5 3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      }
    >
      {/* Popover's own container already applies p-2 -- px-1.5 py-1 here is
          additive on top of that (not a competing override), landing the
          name block's edges a little further in than the divider/button
          below without needing any negative-margin bleed math. */}
      <div className="px-1.5 py-1">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate text-xs text-ink-subtle">{user.email}</p>
        {!user.emailVerified && (
          <p className="mt-1.5 text-xs font-medium text-warning">Email not verified</p>
        )}
      </div>
      <div className="my-1.5 border-t border-border" />
      <button
        type="button"
        disabled={loggingOut}
        onClick={() => void handleLogout()}
        // `!` (important) modifiers, not bare hover:bg-*/hover:text-* --
        // cn() is a naive string join (no tailwind-merge conflict
        // resolution), and this needs to win over nothing else here, but
        // stays consistent with the same override technique used
        // elsewhere in this file's history so a future added base hover
        // class can't silently out-order it.
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left text-sm font-medium text-ink transition-colors duration-150 ease-premium hover:!bg-danger-tint hover:!text-danger disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loggingOut ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
            <path
              d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6M10.5 11l3-3-3-3M13.25 8h-8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        Log out
      </button>
    </Popover>
  );
}
