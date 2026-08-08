'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import type { CurrentUser } from 'shared';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileNav } from './mobile-nav';
import { NotificationBell } from './notification-bell';
import { UserMenu } from './user-menu';

interface AppHeaderProps {
  /**
   * Null while the session is still bootstrapping (AppShell renders this
   * header immediately, before the current user resolves, so the shell --
   * wordmark, nav, timezone banner -- is never missing during that brief
   * window). The wordmark and nav links are static and render identically
   * either way; only the user-specific controls (bell, avatar/menu, mobile
   * sheet trigger) fall back to placeholders until a real user lands.
   */
  user: CurrentUser | null;
  onLoggedOut: () => void;
}

const NAV_ITEMS = [
  { href: '/schedule', label: 'Schedule' },
  { href: '/my-bookings', label: 'My Bookings' },
] as const;

export function AppHeader({ user, onLoggedOut }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavTriggerRef = useRef<HTMLButtonElement>(null);

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
          </nav>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <NotificationBell />
              <UserMenu user={user} onLoggedOut={onLoggedOut} />
            </>
          ) : (
            <>
              <Skeleton className="h-9 w-9" />
              <Skeleton className="ml-2 h-8 w-24" />
            </>
          )}
        </div>

        {/* Mobile-only: the desktop cluster above (NotificationBell +
            UserMenu) is hidden below md:, so the bell needs its own
            always-visible mobile placement rather than being buried a tap
            deeper inside the hamburger drawer -- notifications are
            time-sensitive enough to warrant the same at-a-glance badge
            desktop users get. Reuses the exact same component/popover,
            not a second mobile-specific implementation. */}
        <div className="flex items-center gap-1 md:hidden">
          {user && <NotificationBell />}
          <button
            ref={mobileNavTriggerRef}
            type="button"
            onClick={() => setMobileNavOpen(true)}
            disabled={!user}
            aria-label="Open menu"
            className="rounded-md p-3 text-ink-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>

      {user && (
        <MobileNav
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          user={user}
          onLoggedOut={onLoggedOut}
          triggerRef={mobileNavTriggerRef}
        />
      )}
    </header>
  );
}
