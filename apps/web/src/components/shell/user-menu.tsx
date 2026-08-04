'use client';

import { useState } from 'react';
import type { CurrentUser } from 'shared';
import { Button } from '@/components/ui/button';
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

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      onLoggedOut();
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
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-xs font-semibold text-accent-strong"
      >
        {initials(user.name)}
      </div>
      <Button
        type="button"
        variant="ghost"
        loading={loggingOut}
        onClick={() => void handleLogout()}
        className="px-2.5 py-1.5 text-xs"
      >
        Log out
      </Button>
    </div>
  );
}
