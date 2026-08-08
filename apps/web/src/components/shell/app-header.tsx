'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import type { CurrentUser } from 'shared';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { OfficeZoneNotice } from '@/components/office-zone-notice';
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

export function WordmarkIcon() {
  return (
    <span
      aria-hidden="true"
      // Solid primary fill + white icon, not the previous barely-there
      // accent-tint wash -- a stronger, more premium brand mark (visual-
      // polish pass; still a small 32px chip, not a colored header bar).
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-white shadow-primary"
    >
      <svg viewBox="0 0 16 16" fill="none" className="h-[18px] w-[18px]">
        <rect
          x="2"
          y="2.5"
          width="12"
          height="11"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path d="M2 6h12" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.5 2v2M10.5 2v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <rect x="4.25" y="8" width="2" height="2" rx="0.4" fill="currentColor" />
      </svg>
    </span>
  );
}

export function AppHeader({ user, onLoggedOut }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      {/* max-w-[100rem]: the same ceiling AppShell's <main> uses, not the
          narrower max-w-7xl this used before -- at 1440-1600px desktop
          widths, the wide Schedule page (which claims the shell's full
          canvas) was rendering visibly wider than the header/timezone
          chrome above it, so the header's own edges looked like a
          separate, narrower container rather than the same page. Rooms
          and My Bookings still apply their own narrower content width
          *inside* this shared ceiling, so they stay centered under it
          exactly as before. */}
      <div className="mx-auto flex h-[68px] w-full max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center gap-8">
          <Link
            href="/schedule"
            className="flex shrink-0 items-center gap-2.5 rounded-md transition-opacity duration-150 ease-premium hover:opacity-80"
          >
            <WordmarkIcon />
            <span className="text-sm font-semibold tracking-tight text-ink">Meeting Rooms</span>
          </Link>
          <nav aria-label="Primary" className="hidden h-full items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center rounded-full px-3.5 py-2 text-sm transition-colors duration-150 ease-premium',
                    // A filled violet pill, not just a thin underline --
                    // a deliberately stronger "you are here" signal than
                    // the prior border-bottom treatment, matching the
                    // filled-tab pattern premium SaaS product navs use.
                    active
                      ? 'bg-primary-soft font-semibold text-primary-active'
                      : 'font-medium text-ink-muted hover:bg-surface-hover hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
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
            className="rounded-md p-3 text-ink-muted transition-colors duration-150 ease-premium hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
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

      <OfficeZoneNotice />

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
