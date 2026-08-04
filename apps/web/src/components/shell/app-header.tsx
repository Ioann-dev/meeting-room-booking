'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { CurrentUser } from 'shared';
import { cn } from '@/lib/cn';
import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';

interface AppHeaderProps {
  user: CurrentUser;
  onLoggedOut: () => void;
}

const NAV_ITEMS = [{ href: '/schedule', label: 'Schedule' }] as const;

export function AppHeader({ user, onLoggedOut }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/schedule" className="text-sm font-semibold tracking-tight text-ink">
            Meeting Rooms
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
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
              title="Coming soon"
              className="cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-ink-faint"
            >
              My Bookings
            </span>
          </nav>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label="Notifications (coming soon)"
            title="Notifications (coming soon)"
            className="rounded-md p-2 text-ink-faint disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path
                d="M10 2.5c-2.3 0-4 1.9-4 4.3v2.1c0 .5-.2 1.3-.5 1.8l-1 1.7c-.6 1-.2 2.1.9 2.5 3.6 1.2 7.6 1.2 11.2 0 1-.3 1.5-1.5.9-2.5l-1-1.7c-.3-.5-.5-1.3-.5-1.8V6.8c0-2.4-1.8-4.3-4-4.3Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path
                d="M7.8 16.3a2.3 2.3 0 0 0 4.4 0"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <UserMenu user={user} onLoggedOut={onLoggedOut} />
        </div>

        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-ink-muted hover:bg-canvas hover:text-ink md:hidden"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M3.5 6h13M3.5 10h13M3.5 14h13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        user={user}
        onLoggedOut={onLoggedOut}
      />
    </header>
  );
}
