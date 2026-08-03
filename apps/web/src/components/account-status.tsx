'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { logout } from '@/lib/auth-client';

export function AccountStatus() {
  const { status, user, clearUser } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      clearUser();
      setLoggingOut(false);
    }
  }

  if (status === 'loading') {
    return <p role="status">Checking session…</p>;
  }

  if (status === 'unauthenticated') {
    return (
      <p>
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>{' '}
        or{' '}
        <Link href="/register" className="font-medium underline">
          create an account
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p>
        Logged in as <strong>{user.name}</strong> ({user.email})
        {!user.emailVerified && (
          <span className="ml-2 text-sm text-amber-700">— email not verified</span>
        )}
      </p>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        className="w-fit rounded border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {loggingOut ? 'Logging out…' : 'Log out'}
      </button>
    </div>
  );
}
