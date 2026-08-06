'use client';

import Link from 'next/link';
import {
  getOfficeWeekBoundaries,
  OFFICE_TIMEZONE,
  toZonedParts,
  type MyBookingSummary,
} from 'shared';
import { Button } from '@/components/ui/button';
import { formatClock } from '@/lib/format-clock';
import { formatRangeLabel } from '@/lib/format-range';
import { weekStartToWeekParam } from '@/lib/schedule-week';

interface BookingRowProps {
  booking: MyBookingSummary;
  displayZone: string;
  /** Upcoming rows get a Cancel action; Past rows show a Cancelled indicator instead, when applicable. */
  onCancelClick?: (booking: MyBookingSummary, trigger: HTMLButtonElement) => void;
}

export function BookingRow({ booking, displayZone, onCancelClick }: BookingRowProps) {
  const showOfficeEquivalent = displayZone !== OFFICE_TIMEZONE;
  const officeStart = toZonedParts(booking.startAt, OFFICE_TIMEZONE);
  const officeEnd = toZonedParts(booking.endAt, OFFICE_TIMEZONE);
  const scheduleHref = `/schedule/${booking.roomId}?week=${weekStartToWeekParam(getOfficeWeekBoundaries(booking.startAt).startUtc)}`;

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <Link href={scheduleHref} className="min-w-0 flex-1 rounded-sm">
        <p className="truncate text-sm font-medium text-ink">{booking.title}</p>
        <p className="truncate text-sm text-ink-subtle">{booking.roomName}</p>
        <p className="mt-0.5 text-xs text-ink-subtle">
          <span className="tabular-nums">
            {formatRangeLabel(booking.startAt, booking.endAt, displayZone)}
          </span>
          {showOfficeEquivalent && (
            <span className="ml-1 tabular-nums">
              ({formatClock(officeStart.hour, officeStart.minute)}–
              {formatClock(officeEnd.hour, officeEnd.minute)} Europe/Kyiv)
            </span>
          )}
        </p>
        {booking.seriesId && <p className="mt-0.5 text-xs text-ink-faint">Recurring booking</p>}
      </Link>
      {onCancelClick && (
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={(event) => onCancelClick(booking, event.currentTarget)}
        >
          Cancel
        </Button>
      )}
      {!onCancelClick && booking.status === 'CANCELLED' && (
        <span className="shrink-0 text-xs font-medium text-ink-faint" aria-label="Cancelled">
          ✕ Cancelled
        </span>
      )}
    </li>
  );
}
