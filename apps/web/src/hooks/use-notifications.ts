'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationSummary } from 'shared';
import { useToast } from '@/components/ui/toast';
import { fetchNotifications, markAllNotificationsRead } from '@/lib/notifications-client';

// Frequent enough that "your booking is ending soon" toasts land promptly
// without needing a live connection; cheap enough to poll continuously for
// a background feature. Not itself the notify-window threshold -- that's
// the server's NOTIFY_BEFORE_MINUTES.
const POLL_INTERVAL_MS = 45_000;

export function useNotifications() {
  const [items, setItems] = useState<NotificationSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Bumped to trigger a fetch: by the interval on a timer, or by `refresh()`
  // (e.g. the bell popover opening) -- the fetch itself is driven entirely
  // by this dependency rather than an imperative function call into shared
  // fetch logic, which keeps the effect body itself lint-clean (no
  // synchronous setState call sites for the react-hooks/set-state-in-effect
  // rule to flag).
  const [refreshToken, setRefreshToken] = useState(0);
  const { showToast } = useToast();
  // Kept in sync via its own effect (not assigned during render) so the
  // fetch effect below can always reach the latest showToast without
  // needing it in its own dependency array.
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  });

  useEffect(() => {
    let cancelled = false;
    fetchNotifications()
      .then((response) => {
        if (cancelled) {
          return;
        }
        setItems(response.items);
        setUnreadCount(response.unreadCount);
        // The server guarantees `justDelivered` is true at most once ever
        // per notification (see NotificationsService.listForUser) -- no
        // local seen-id tracking needed here to avoid a double toast.
        for (const item of response.items) {
          if (item.justDelivered) {
            showToastRef.current(
              `Your booking "${item.endingBookingTitle}" in ${item.roomName} ends soon -- the next slot is booked.`,
              'info',
            );
          }
        }
      })
      .catch(() => {
        // A failed background poll is silently skipped and retried on the
        // next tick -- surfacing an error state for this would be noisier
        // than useful for a non-critical background refresh.
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  useEffect(() => {
    const interval = setInterval(() => setRefreshToken((token) => token + 1), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  // Optimistic and local-only: clears the bell badge immediately without
  // waiting for the network, and deliberately does NOT trigger a refresh
  // afterward, so a panel that's still open doesn't visibly flip everything
  // to "read" while the user is looking at it. The next refresh (poll tick
  // or reopen) picks up the server's real state.
  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    void markAllNotificationsRead();
  }, []);

  return { items, unreadCount, refresh, markAllRead };
}
