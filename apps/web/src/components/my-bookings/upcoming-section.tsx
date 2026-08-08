'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { MyBookingSummary } from 'shared';
import { BookingCancelPanel, type CancelScope } from '@/components/booking/booking-cancel-panel';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-error';
import { fetchMyUpcomingBookings } from '@/lib/my-bookings-client';
import { BookingRow } from './booking-row';

type LoadState =
  { phase: 'error'; message: string } | { phase: 'ready'; items: MyBookingSummary[] };

const SKELETON_ROW_COUNT = 3;

export function UpcomingSection({ displayZone }: { displayZone: string }) {
  const [attempt, setAttempt] = useState(0);
  // Identified by `requestKey` (not a stored "loading" flag) so `loading`
  // below can only ever reflect a real fetch/response transition -- the
  // same pattern RoomScheduleView/SchedulePage/PastSection use.
  const [result, setResult] = useState<{ requestKey: number; state: LoadState } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MyBookingSummary | null>(null);
  const cancelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchMyUpcomingBookings()
      .then((response) => {
        if (!cancelled) {
          setResult({ requestKey: attempt, state: { phase: 'ready', items: response.items } });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setResult({
          requestKey: attempt,
          state: {
            phase: 'error',
            message:
              error instanceof ApiError
                ? error.messages.join(' ')
                : 'Could not load your upcoming bookings.',
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const loading = result === null || result.requestKey !== attempt;

  function handleCancelled(scope: CancelScope) {
    setCancelTarget(null);
    showToast(
      scope === 'series'
        ? 'Recurring booking series cancelled.'
        : scope === 'occurrence'
          ? 'This occurrence was cancelled.'
          : 'Booking cancelled.',
      'success',
    );
    setAttempt((current) => current + 1);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    );
  }

  if (result.state.phase === 'error') {
    return (
      <ErrorState
        title="Could not load your upcoming bookings"
        description={result.state.message}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    );
  }

  if (result.state.items.length === 0) {
    return (
      <EmptyState
        title="No upcoming bookings"
        description="Book a room from the schedule to see it here."
        action={
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 ease-premium hover:border-border-strong hover:bg-surface-hover"
          >
            Browse rooms
          </Link>
        }
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {result.state.items.map((booking) => (
          <BookingRow
            key={booking.id}
            booking={booking}
            displayZone={displayZone}
            onCancelClick={(target, trigger) => {
              cancelTriggerRef.current = trigger;
              setCancelTarget(target);
            }}
          />
        ))}
      </ul>
      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
          }
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          cancelTriggerRef.current?.focus();
        }}
        title={cancelTarget?.title ?? 'Booking'}
      >
        {cancelTarget && (
          <BookingCancelPanel
            key={cancelTarget.id}
            booking={cancelTarget}
            onCancelled={handleCancelled}
            onKeepBooking={() => setCancelTarget(null)}
          />
        )}
      </Dialog>
    </>
  );
}
