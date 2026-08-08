'use client';

import Link from 'next/link';
import {
  getOfficeWeekBoundaries,
  OFFICE_TIMEZONE,
  toZonedParts,
  type MyBookingSummary,
} from 'shared';
import { Button } from '@/components/ui/button';
import { paletteForId } from '@/lib/event-palette';
import { formatClock } from '@/lib/format-clock';
import { WEEKDAY_LABELS_SHORT } from '@/lib/format-date';
import { formatRangeLabel } from '@/lib/format-range';
import { weekStartToWeekParam } from '@/lib/schedule-week';

interface BookingRowProps {
  booking: MyBookingSummary;
  displayZone: string;
  /** Upcoming rows get a Cancel action; Past rows show a Cancelled indicator instead, when applicable. */
  onCancelClick?: (booking: MyBookingSummary, trigger: HTMLButtonElement) => void;
  /**
   * Past rows: a calmer, neutral date tile instead of the room's own
   * accent color -- "quieter", per the brief, not disabled-looking (the
   * row keeps full opacity and every other treatment, only the tile's
   * color emphasis is dialed back since a completed booking no longer
   * needs the same "plan around this" visual weight an upcoming one does).
   */
  muted?: boolean;
}

export function BookingRow({
  booking,
  displayZone,
  onCancelClick,
  muted = false,
}: BookingRowProps) {
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
  // Same deterministic id-hash palette room cards and the schedule's own
  // event colors draw from, keyed by the booking's room -- a room's color
  // identity therefore reads the same on this list as it does on the
  // Rooms page and inside that room's own calendar, rather than a fourth,
  // unrelated color choice.
  const accent = paletteForId(booking.roomId);

  return (
    <li className="group relative flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-premium hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_10px_20px_-10px_rgb(15_23_32_/_0.18)]">
      <Link href={scheduleHref} className="flex min-w-0 flex-1 items-center gap-4 rounded-sm">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border leading-none"
          style={
            muted
              ? undefined
              : {
                  backgroundColor: accent.background,
                  borderColor: accent.border,
                  color: accent.title,
                }
          }
        >
          {/* Solid inherited color (from the tile's own `color: accent.title`
              inline style above), not opacity -- opacity blends toward the
              tile's background and silently drops contrast below AA for
              some palette entries (amber measured 3.7:1 here), the same
              opacity-based-hierarchy trap already caught and avoided in
              BookingBlock's own title/secondary lines. Weight/size alone
              carries the hierarchy instead. */}
          <span
            className={
              muted
                ? 'text-[10px] font-medium uppercase tracking-wide text-ink-faint'
                : 'text-[10px] font-semibold uppercase tracking-wide'
            }
          >
            {WEEKDAY_LABELS_SHORT[badgeParts.weekday - 1]}
          </span>
          <span
            className={
              muted
                ? 'tabular-nums mt-0.5 text-base font-semibold text-ink'
                : 'tabular-nums mt-0.5 text-base font-bold'
            }
          >
            {badgeParts.day}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{booking.title}</p>
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
        <span
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-ink-faint"
          aria-label="Cancelled"
        >
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-3 w-3">
            <path
              d="m3.5 3.5 7 7M10.5 3.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          Cancelled
        </span>
      )}
    </li>
  );
}
