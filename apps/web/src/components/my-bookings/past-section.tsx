'use client';

import { useEffect, useState } from 'react';
import type { MyBookingSummary } from 'shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-error';
import { fetchMyPastBookings } from '@/lib/my-bookings-client';
import { BookingRow } from './booking-row';

type LoadState =
  | { phase: 'error'; message: string }
  | { phase: 'ready'; items: MyBookingSummary[]; nextCursor: string | null };

const SKELETON_ROW_COUNT = 3;

export function PastSection({ displayZone }: { displayZone: string }) {
  const [attempt, setAttempt] = useState(0);
  // Identified by `requestKey` (not a stored "loading" flag) so `loading`
  // below can only ever reflect a real fetch/response transition -- the
  // same pattern RoomScheduleView/SchedulePage use -- instead of a
  // synchronous `setResult(null)` at the top of the effect, which the
  // react-hooks/set-state-in-effect lint rule flags.
  const [result, setResult] = useState<{ requestKey: number; state: LoadState } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyPastBookings()
      .then((response) => {
        if (!cancelled) {
          setResult({
            requestKey: attempt,
            state: { phase: 'ready', items: response.items, nextCursor: response.nextCursor },
          });
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
                : 'Could not load your past bookings.',
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const loading = result === null || result.requestKey !== attempt;

  async function handleLoadMore() {
    if (loading || result.state.phase !== 'ready' || !result.state.nextCursor) {
      return;
    }
    setLoadMoreError(null);
    setLoadingMore(true);
    try {
      const response = await fetchMyPastBookings(result.state.nextCursor);
      setResult((current) =>
        current && current.state.phase === 'ready'
          ? {
              requestKey: current.requestKey,
              state: {
                phase: 'ready',
                items: [...current.state.items, ...response.items],
                nextCursor: response.nextCursor,
              },
            }
          : current,
      );
    } catch (error) {
      setLoadMoreError(
        error instanceof ApiError ? error.messages.join(' ') : 'Could not load more bookings.',
      );
    } finally {
      setLoadingMore(false);
    }
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
        title="Could not load your past bookings"
        description={result.state.message}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    );
  }

  if (result.state.items.length === 0) {
    return (
      <EmptyState
        title="No past bookings"
        description="Bookings you've completed or cancelled will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {result.state.items.map((booking) => (
          <BookingRow key={booking.id} booking={booking} displayZone={displayZone} />
        ))}
      </ul>
      {loadMoreError && (
        <Alert variant="error">
          {loadMoreError}{' '}
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={() => void handleLoadMore()}
          >
            Retry
          </button>
        </Alert>
      )}
      {result.state.nextCursor ? (
        <Button
          type="button"
          variant="secondary"
          loading={loadingMore}
          onClick={() => void handleLoadMore()}
          className="self-center"
        >
          Load more
        </Button>
      ) : (
        <p className="text-center text-xs text-ink-faint">You&apos;ve reached the end.</p>
      )}
    </div>
  );
}
