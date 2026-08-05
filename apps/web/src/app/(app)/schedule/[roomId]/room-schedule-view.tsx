'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  getAdjacentOfficeWeek,
  getTodayDayIndex,
  isUnambiguousIsoInstant,
  OFFICE_TIMEZONE,
  SLOT_MINUTES,
  toZonedParts,
  type BookingSummary,
  type RoomScheduleResponse,
  type RoomSummary,
} from 'shared';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { RoomHeader } from '@/components/schedule/room-header';
import { WeekNavigation } from '@/components/schedule/week-navigation';
import { WeeklyGrid } from '@/components/schedule/weekly-grid';
import { SelectedSlotSummary } from '@/components/schedule/selected-slot-summary';
import { BookingDetailDialog } from '@/components/schedule/booking-detail-dialog';
import { useUserTimeZone } from '@/hooks/use-user-time-zone';
import { ApiError } from '@/lib/api-error';
import { formatClock } from '@/lib/format-clock';
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
  const start = toZonedParts(startInstant, zone);
  const endInstant = new Date(
    new Date(startInstant).getTime() + SLOT_MINUTES * 60_000,
  ).toISOString();
  const end = toZonedParts(endInstant, zone);
  const dateLabel = new Date(Date.UTC(start.year, start.month - 1, start.day)).toLocaleDateString(
    'en-US',
    { weekday: 'long', month: 'short', day: 'numeric' },
  );
  return `${dateLabel} · ${formatClock(start.hour, start.minute)}–${formatClock(end.hour, end.minute)}`;
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

  const weekParam = searchParams.get('week');
  const slotStartParam = searchParams.get('slotStart');

  const [now, setNow] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ requestKey: string; state: LoadState } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingSummary | null>(null);
  const bookingTriggerRef = useRef<HTMLButtonElement | null>(null);

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
            notFound: error instanceof ApiError && error.status === 404,
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, referenceDate, requestKey]);

  const loading = requestKey === null || result === null || result.requestKey !== requestKey;

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

  if (loading) {
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
    <div className="flex flex-col gap-6">
      <RoomHeader room={room} />
      <WeekNavigation
        weekStartUtc={schedule.weekStartUtc}
        isCurrentWeek={isCurrentWeek}
        onNavigate={handleNavigateWeek}
      />
      {selectedSlotStart && (
        <SelectedSlotSummary
          label={formatSelectedSlotLabel(selectedSlotStart, displayZone)}
          onClear={handleClearSelection}
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
        browserStartLabel={
          selectedBooking ? formatBookingTime(selectedBooking.startAt, displayZone) : ''
        }
        browserEndLabel={
          selectedBooking ? formatBookingTime(selectedBooking.endAt, displayZone) : ''
        }
        officeStartLabel={
          selectedBooking ? formatBookingTime(selectedBooking.startAt, OFFICE_TIMEZONE) : ''
        }
        officeEndLabel={
          selectedBooking ? formatBookingTime(selectedBooking.endAt, OFFICE_TIMEZONE) : ''
        }
        showOfficeEquivalent={showOfficeEquivalent}
      />
    </div>
  );
}
