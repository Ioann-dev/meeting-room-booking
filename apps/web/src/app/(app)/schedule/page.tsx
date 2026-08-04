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
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; rooms: RoomSummary[] };

const SKELETON_COUNT = 6;

export default function SchedulePage() {
  const [minCapacityInput, setMinCapacityInput] = useState('');
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const minCapacity = useMemo(() => {
    const trimmed = minCapacityInput.trim();
    if (trimmed === '') {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
  }, [minCapacityInput]);

  useEffect(() => {
    let cancelled = false;

    void fetchRooms(minCapacity)
      .then((rooms) => {
        if (!cancelled) {
          setState({ phase: 'ready', rooms });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setState({
          phase: 'error',
          message: error instanceof ApiError ? error.messages.join(' ') : 'Could not load rooms.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [minCapacity, attempt]);

  function handleCapacityChange(value: string) {
    setState({ phase: 'loading' });
    setMinCapacityInput(value);
  }

  function handleRetry() {
    setState({ phase: 'loading' });
    setAttempt((current) => current + 1);
  }

  function handleClearFilter() {
    setState({ phase: 'loading' });
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

      {state.phase === 'loading' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      )}

      {state.phase === 'error' && (
        <ErrorState
          title="Could not load rooms"
          description={state.message}
          onRetry={handleRetry}
        />
      )}

      {state.phase === 'ready' && state.rooms.length === 0 && (
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

      {state.phase === 'ready' && state.rooms.length > 0 && <RoomList rooms={state.rooms} />}
    </div>
  );
}
