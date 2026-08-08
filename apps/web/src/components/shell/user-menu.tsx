'use client';

import { useState } from 'react';
import type { CurrentUser } from 'shared';
import { Button } from '@/components/ui/button';
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

export function UserMenu({ user, onLoggedOut }: UserMenuProps) {
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
    <div className="flex items-center gap-3 border-l border-border pl-3">
      <div className="hidden flex-col items-end leading-tight sm:flex">
        <span className="text-sm font-medium text-ink">{user.name}</span>
        {!user.emailVerified && <span className="text-xs text-warning">Email not verified</span>}
      </div>
      <div
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-tint text-xs font-semibold text-accent-strong"
      >
        {initials(user.name)}
      </div>
      <Button
        type="button"
        variant="ghost"
        loading={loggingOut}
        onClick={() => void handleLogout()}
        // `!` (important) modifiers, not bare hover:bg-*/hover:text-* --
        // cn() is a naive string join (no tailwind-merge conflict
        // resolution), so a second unmarked hover:bg-* class here would
        // compete with the ghost variant's own hover:bg-surface-hover
        // purely by Tailwind's generated-CSS source order, not this JSX's
        // order (see BookingBlock/SlotCell's today-tint history for this
        // exact bug class). The important modifier makes this override
        // deterministic instead of order-dependent.
        className="px-2.5 py-1.5 text-xs hover:!bg-danger-tint hover:!text-danger"
      >
        Log out
      </Button>
    </div>
  );
}
