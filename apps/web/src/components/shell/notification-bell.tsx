'use client';

import { useState } from 'react';
import { OFFICE_TIMEZONE, toZonedParts } from 'shared';
import { Popover } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/use-notifications';
import { useUserTimeZone } from '@/hooks/use-user-time-zone';
import { formatClock } from '@/lib/format-clock';

function formatNotificationTime(instant: string, zone: string): string {
  const parts = toZonedParts(instant, zone);
  const dateLabel = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric' },
  );
  return `${dateLabel} · ${formatClock(parts.hour, parts.minute)}`;
}

function BellIcon() {
  return (
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
  );
}

/**
 * Header bell: unread badge, a popover listing recent ending-soon
 * notifications, and (via `useNotifications`) a toast the moment a
 * notification is first delivered. Rendered twice by AppHeader -- once in
 * the desktop cluster, once in the always-visible mobile header area --
 * rather than needing any mobile-specific variant of its own.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, refresh, markAllRead } = useNotifications();
  const userTimeZone = useUserTimeZone();
  const displayZone = userTimeZone ?? OFFICE_TIMEZONE;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      void refresh();
      markAllRead();
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      align="end"
      trigger={
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative rounded-md p-3 text-ink-muted transition-colors hover:bg-canvas hover:text-ink md:p-2"
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      }
    >
      <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        Notifications
      </p>
      {items.length === 0 ? (
        <p className="px-2 py-4 text-center text-sm text-ink-subtle">No notifications yet</p>
      ) : (
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="rounded-md px-2 py-2 text-sm">
              <p className="text-ink">
                Your booking &quot;{item.endingBookingTitle}&quot; in {item.roomName} ends soon --
                the next slot is booked.
              </p>
              <p className="mt-0.5 tabular-nums text-xs text-ink-faint">
                {formatNotificationTime(item.endingBookingEndAt, displayZone)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
