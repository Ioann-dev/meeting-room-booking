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
import { WEEKDAY_LABELS_SHORT } from '@/lib/format-date';
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
  // Viewer-zone weekday/day for the badge -- the same day+month vocabulary
  // the schedule grid's own day headers use (WEEKDAY_LABELS_SHORT plus a
  // bare day number), so a booking row and the grid it links back to read
  // as one consistent date "voice" rather than two different systems.
  const badgeParts = toZonedParts(booking.startAt, displayZone);
  const scheduleHref = `/schedule/${booking.roomId}?week=${weekStartToWeekParam(getOfficeWeekBoundaries(booking.startAt).startUtc)}`;
  const timeRangeLabel = formatRangeLabel(booking.startAt, booking.endAt, displayZone).split(
    ' · ',
  )[1];

  return (
    <li className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3.5 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-sm">
      <Link href={scheduleHref} className="flex min-w-0 flex-1 items-center gap-4 rounded-sm">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-surface-muted leading-none"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {WEEKDAY_LABELS_SHORT[badgeParts.weekday - 1]}
          </span>
          <span className="tabular-nums mt-0.5 text-base font-semibold text-ink">
            {badgeParts.day}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{booking.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-subtle">
            <span className="truncate">{booking.roomName}</span>
            <span aria-hidden="true" className="text-ink-faint">
              {'·'}
            </span>
            <span className="tabular-nums">{timeRangeLabel}</span>
            {showOfficeEquivalent && (
              <span className="tabular-nums text-ink-faint">
                ({formatClock(officeStart.hour, officeStart.minute)}
                {'–'}
                {formatClock(officeEnd.hour, officeEnd.minute)} Europe/Kyiv)
              </span>
            )}
          </p>
          {booking.seriesId && (
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-faint">
              <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-3 w-3">
                <path
                  d="M2.5 7a4.5 4.5 0 0 1 7.6-3.25M11.5 7a4.5 4.5 0 0 1-7.6 3.25"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M10.6 2.9v1.85H8.75M3.4 11.1V9.25h1.85"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Recurring booking
            </p>
          )}
        </div>
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
          {'✕ Cancelled'}
        </span>
      )}
    </li>
  );
}
