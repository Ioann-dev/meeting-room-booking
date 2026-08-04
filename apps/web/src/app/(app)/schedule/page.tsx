'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RoomSummary } from 'shared';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CapacityFilter } from '@/components/rooms/capacity-filter';
import { RoomList } from '@/components/rooms/room-list';
import { ApiError } from '@/lib/api-error';
import { fetchRooms } from '@/lib/rooms-client';

type LoadState =
  | { phase: 'error'; message: string }
  | { phase: 'ready'; rooms: RoomSummary[] };

interface Result {
  requestKey: string;
  state: LoadState;
}

const SKELETON_COUNT = 6;

export default function SchedulePage() {
  const [minCapacityInput, setMinCapacityInput] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const minCapacity = useMemo(() => {
    const trimmed = minCapacityInput.trim();
    if (trimmed === '') {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
  }, [minCapacityInput]);

  // The request in flight is identified by this key rather than a stored
  // "loading" flag: `loading` below is then derived from whether the last
  // completed request matches it, so it can only ever reflect a real
  // fetch/response transition instead of drifting out of sync with one.
  const requestKey = `${minCapacity ?? 'all'}:${attempt}`;

  useEffect(() => {
    let cancelled = false;

    void fetchRooms(minCapacity)
      .then((rooms) => {
        if (!cancelled) {
          setResult({ requestKey, state: { phase: 'ready', rooms } });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setResult({
          requestKey,
          state: {
            phase: 'error',
            message: error instanceof ApiError ? error.messages.join(' ') : 'Could not load rooms.',
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [minCapacity, attempt, requestKey]);

  const loading = result === null || result.requestKey !== requestKey;

  function handleCapacityChange(value: string) {
    setMinCapacityInput(value);
  }

  function handleRetry() {
    setAttempt((current) => current + 1);
  }

  function handleClearFilter() {
    setMinCapacityInput('');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Rooms</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          Browse the meeting rooms available across the office.
        </p>
      </div>

      <CapacityFilter value={minCapacityInput} onChange={handleCapacityChange} />

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      )}

      {!loading && result.state.phase === 'error' && (
        <ErrorState
          title="Could not load rooms"
          description={result.state.message}
          onRetry={handleRetry}
        />
      )}

      {!loading && result.state.phase === 'ready' && result.state.rooms.length === 0 && (
        <EmptyState
          title="No rooms match this capacity"
          description="Try lowering the minimum capacity."
          action={
            <Button type="button" variant="secondary" onClick={handleClearFilter}>
              Clear filter
            </Button>
          }
        />
      )}

      {!loading && result.state.phase === 'ready' && result.state.rooms.length > 0 && (
        <RoomList rooms={result.state.rooms} />
      )}
    </div>
  );
}
