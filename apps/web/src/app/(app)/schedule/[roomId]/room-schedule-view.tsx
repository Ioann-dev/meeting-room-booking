'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  getAdjacentOfficeWeek,
  getTodayDayIndex,
  getZonedDateOffsetDays,
  isUnambiguousIsoInstant,
  OFFICE_TIMEZONE,
  SLOT_MINUTES,
  toZonedParts,
  type BookingSeriesSummary,
  type BookingSummary,
  type RoomScheduleResponse,
  type RoomSummary,
} from 'shared';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { RoomHeader } from '@/components/schedule/room-header';
import { WeekNavigation } from '@/components/schedule/week-navigation';
import { WeeklyGrid } from '@/components/schedule/weekly-grid';
import { SelectedSlotSummary } from '@/components/schedule/selected-slot-summary';
import { BookingDetailDialog } from '@/components/schedule/booking-detail-dialog';
import { BookingCreateDialog } from '@/components/schedule/booking-create-dialog';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserTimeZone } from '@/hooks/use-user-time-zone';
import { ApiError } from '@/lib/api-error';
import { isBookingSeriesSummary } from '@/lib/booking-client';
import { formatClock } from '@/lib/format-clock';
import { formatRangeLabel } from '@/lib/format-range';
import { fetchRoom } from '@/lib/rooms-client';
import { fetchRoomSchedule } from '@/lib/schedule-client';
import {
  todayWeekParam,
  weekParamToReferenceDate,
  weekStartToWeekParam,
} from '@/lib/schedule-week';

type LoadState =
  | { phase: 'error'; message: string; notFound: boolean }
  | { phase: 'ready'; room: RoomSummary; schedule: RoomScheduleResponse };

function formatSelectedSlotLabel(startInstant: string, zone: string): string {
  const endInstant = new Date(
    new Date(startInstant).getTime() + SLOT_MINUTES * 60_000,
  ).toISOString();
  return formatRangeLabel(startInstant, endInstant, zone);
}

function formatBookingTime(instant: string, zone: string): string {
  const parts = toZonedParts(instant, zone);
  return formatClock(parts.hour, parts.minute);
}

export function RoomScheduleView() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userTimeZone = useUserTimeZone();
  const { user } = useCurrentUser();
  const { showToast } = useToast();

  const weekParam = searchParams.get('week');
  const slotStartParam = searchParams.get('slotStart');

  const [now, setNow] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ requestKey: string; state: LoadState } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingSummary | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const bookingTriggerRef = useRef<HTMLButtonElement | null>(null);
  const createTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setNow(new Date().toISOString());
      }
    });
    const interval = setInterval(() => setNow(new Date().toISOString()), 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Canonicalize a missing/malformed `week` param to today's office-local
  // date before anything fetches, so the fetch effect below only ever runs
  // once per real week instead of once for "no param" and again once the
  // canonical param lands.
  useEffect(() => {
    if (weekParam && weekParamToReferenceDate(weekParam) !== undefined) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set('week', todayWeekParam());
    router.replace(`${pathname}?${next.toString()}`);
  }, [weekParam, pathname, router, searchParams]);

  const referenceDate = weekParam ? weekParamToReferenceDate(weekParam) : undefined;
  const requestKey = referenceDate !== undefined ? `${roomId}:${referenceDate}:${attempt}` : null;

  useEffect(() => {
    if (requestKey === null || referenceDate === undefined) {
      return;
    }
    let cancelled = false;

    void Promise.all([fetchRoom(roomId), fetchRoomSchedule(roomId, referenceDate)])
      .then(([room, schedule]) => {
        if (!cancelled) {
          setResult({ requestKey, state: { phase: 'ready', room, schedule } });
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
            message:
              error instanceof ApiError ? error.messages.join(' ') : 'Could not load the schedule.',
            // A malformed roomId (e.g. a truncated/mistyped link) fails the
            // API's UUID validation with a 400, not a 404 -- but from the
            // user's perspective "this id doesn't parse" and "this id
            // parses but doesn't exist" both mean the same thing: this
            // room reference doesn't resolve to something they can view.
            // Both collapse to the same friendly not-found state rather
            // than leaking the 400's raw validator message.
            notFound: error instanceof ApiError && (error.status === 404 || error.status === 400),
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, referenceDate, requestKey]);

  // Only the very first fetch (no result yet at all) blanks the page to
  // skeletons. A post-mutation refresh (bumping `attempt`) instead keeps
  // rendering the previous ready state while the new request is in
  // flight -- otherwise every successful booking/cancel would flash the
  // whole grid to skeletons, which reads as a jarring reload rather than
  // an "immediate" update.
  const firstLoad = requestKey === null || result === null;
  const isRefreshing = !firstLoad && result.requestKey !== requestKey;

  const displayZone = userTimeZone ?? OFFICE_TIMEZONE;
  const selectedSlotStart =
    slotStartParam &&
    isUnambiguousIsoInstant(slotStartParam) &&
    (now === null || slotStartParam > now)
      ? slotStartParam
      : null;

  function updateSearchParams(mutate: (next: URLSearchParams) => void, mode: 'push' | 'replace') {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const url = `${pathname}?${next.toString()}`;
    if (mode === 'push') {
      router.push(url);
    } else {
      router.replace(url);
    }
  }

  function handleNavigateWeek(direction: 'previous' | 'next' | 'current') {
    if (result === null || result.state.phase !== 'ready') {
      return;
    }
    const nextWeekParam =
      direction === 'current'
        ? todayWeekParam()
        : weekStartToWeekParam(
            getAdjacentOfficeWeek(result.state.schedule.weekStartUtc, direction).startUtc,
          );
    updateSearchParams((next) => {
      next.set('week', nextWeekParam);
      next.delete('slotStart');
    }, 'push');
  }

  function handleSelectSlot(isoInstant: string) {
    updateSearchParams((next) => next.set('slotStart', isoInstant), 'replace');
  }

  function handleClearSelection() {
    updateSearchParams((next) => next.delete('slotStart'), 'replace');
  }

  function handleOpenCreateDialog(trigger: HTMLButtonElement) {
    createTriggerRef.current = trigger;
    setCreateDialogOpen(true);
  }

  function handleCreated(created: BookingSummary | BookingSeriesSummary) {
    setCreateDialogOpen(false);
    const message = isBookingSeriesSummary(created)
      ? `Recurring booking confirmed — ${created.occurrenceCount} weekly occurrences.`
      : `Booking confirmed for ${formatRangeLabel(created.startAt, created.endAt, displayZone)}.`;
    showToast(message, 'success');
    if (slotStartParam) {
      handleClearSelection();
    }
    setAttempt((current) => current + 1);
  }

  function handleCancelled(scope: 'single' | 'occurrence' | 'series') {
    setSelectedBooking(null);
    const message =
      scope === 'series'
        ? 'Recurring booking series cancelled.'
        : scope === 'occurrence'
          ? 'This occurrence was cancelled.'
          : 'Booking cancelled.';
    showToast(message, 'success');
    setAttempt((current) => current + 1);
  }

  if (firstLoad) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-10" />
          ))}
        </div>
      </div>
    );
  }

  if (result.state.phase === 'error') {
    const { message, notFound } = result.state;
    return (
      <div className="flex flex-col items-center gap-3">
        <ErrorState
          title={notFound ? 'Room not found' : 'Could not load the schedule'}
          description={notFound ? "This room doesn't exist or may have been removed." : message}
          onRetry={notFound ? undefined : () => setAttempt((current) => current + 1)}
        />
        {notFound && (
          <Link
            href="/schedule"
            className="text-sm font-medium text-accent hover:text-accent-strong"
          >
            Back to all rooms
          </Link>
        )}
      </div>
    );
  }

  const { room, schedule } = result.state;
  const isCurrentWeek = now !== null && getTodayDayIndex(now, schedule.weekStartUtc) !== null;
  const showOfficeEquivalent = userTimeZone !== null && userTimeZone !== OFFICE_TIMEZONE;

  return (
    <div className="flex flex-col gap-4" aria-busy={isRefreshing || undefined}>
      <RoomHeader room={room} onBook={handleOpenCreateDialog} />
      <WeekNavigation
        weekStartUtc={schedule.weekStartUtc}
        isCurrentWeek={isCurrentWeek}
        onNavigate={handleNavigateWeek}
      />
      {selectedSlotStart && (
        <SelectedSlotSummary
          label={formatSelectedSlotLabel(selectedSlotStart, displayZone)}
          onClear={handleClearSelection}
          onBook={handleOpenCreateDialog}
        />
      )}
      <WeeklyGrid
        roomName={room.name}
        schedule={schedule}
        userTimeZone={userTimeZone}
        selectedSlotStart={selectedSlotStart}
        onSelectSlot={handleSelectSlot}
        onSelectBooking={(booking, trigger) => {
          bookingTriggerRef.current = trigger;
          setSelectedBooking(booking);
        }}
        now={now}
      />
      <BookingDetailDialog
        booking={selectedBooking}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBooking(null);
          }
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          bookingTriggerRef.current?.focus();
        }}
        onCancelled={handleCancelled}
        browserStartLabel={
          selectedBooking ? formatBookingTime(selectedBooking.startAt, displayZone) : ''
        }
        browserEndLabel={
          selectedBooking ? formatBookingTime(selectedBooking.endAt, displayZone) : ''
        }
        browserStartDayOffset={
          selectedBooking
            ? getZonedDateOffsetDays(selectedBooking.startAt, displayZone, OFFICE_TIMEZONE)
            : 0
        }
        browserEndDayOffset={
          selectedBooking
            ? getZonedDateOffsetDays(selectedBooking.endAt, displayZone, OFFICE_TIMEZONE)
            : 0
        }
        officeStartLabel={
          selectedBooking ? formatBookingTime(selectedBooking.startAt, OFFICE_TIMEZONE) : ''
        }
        officeEndLabel={
          selectedBooking ? formatBookingTime(selectedBooking.endAt, OFFICE_TIMEZONE) : ''
        }
        showOfficeEquivalent={showOfficeEquivalent}
      />
      <BookingCreateDialog
        open={createDialogOpen}
        room={room}
        weekStartUtc={schedule.weekStartUtc}
        initialSlotStart={selectedSlotStart}
        now={now}
        displayZone={displayZone}
        emailVerified={user?.emailVerified ?? false}
        onOpenChange={setCreateDialogOpen}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          createTriggerRef.current?.focus();
        }}
        onCreated={handleCreated}
      />
    </div>
  );
}
