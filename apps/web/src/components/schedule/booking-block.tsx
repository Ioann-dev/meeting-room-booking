'use client';

import type { CSSProperties } from 'react';
import type { BookingSummary } from 'shared';
import { cn } from '@/lib/cn';
import { paletteForId } from '@/lib/event-palette';

interface BookingBlockProps {
  booking: BookingSummary;
  rowSpan: number;
  startLabel: string;
  endLabel: string;
  onSelect: (booking: BookingSummary, trigger: HTMLButtonElement) => void;
  /** 0-1 fraction of this block's height where the current-time line falls, if it does. */
  currentTimeFraction?: number;
  gridColumn: number;
  gridRowStart: number;
}

export function BookingBlock({
  booking,
  rowSpan,
  startLabel,
  endLabel,
  onSelect,
  currentTimeFraction,
  gridColumn,
  gridRowStart,
}: BookingBlockProps) {
  // An always-present explicit aria-label, rather than relying on visible
  // subtree text, is what lets the 30-minute case below drop its time line
  // visually without losing it from the accessible name -- an explicit
  // aria-label wins the accessible-name computation over subtree text
  // content regardless of what's actually rendered, so this one string is
  // the single source of truth for "the complete booking" at every
  // duration, not a duration-conditional special case.
  const accessibleName = `${booking.title}, ${
    booking.isOwnBooking ? 'your booking' : booking.authorName
  }, ${startLabel}–${endLabel}`;

  // Own bookings always get the fixed teal ownership treatment (never the
  // per-event hash palette) so "this is mine" stays a single, predictable
  // signal across the whole grid regardless of which room or week is being
  // viewed. Every other booking draws a deterministic color from the
  // 7-hue event palette, keyed by booking id -- stable across re-renders
  // and polling refreshes, never randomly reassigned.
  const palette = booking.isOwnBooking ? null : paletteForId(booking.id);
  const background = booking.isOwnBooking ? 'var(--color-teal-soft)' : palette!.background;
  const borderColor = booking.isOwnBooking ? 'var(--color-teal)' : palette!.border;
  const titleColor = booking.isOwnBooking ? '#0A675A' : palette!.title;

  // grid-row: span N -- the grid track-sizing algorithm computes the exact
  // pixel height for N spanned tracks (including their internal 1px gaps)
  // itself; unlike the old table implementation, there is no manual
  // N*unit+(N-1)*1px arithmetic to keep in sync with the row unit by hand.
  const style: CSSProperties = {
    gridColumn,
    gridRow: `${gridRowStart} / span ${rowSpan}`,
    background,
    borderLeftColor: borderColor,
  };

  return (
    <button
      type="button"
      onClick={(event) => onSelect(booking, event.currentTarget)}
      aria-label={accessibleName}
      style={style}
      className={cn(
        // overflow-hidden clips whatever doesn't fit a duration-locked box
        // -- a booking's own content (long title, long name) must never be
        // what determines this block's height, only `rowSpan` does that.
        // m-px: a hairline inset so the rounded corners have room to read
        // as a rounded card sitting on the grid, rather than a rounded
        // shape fighting the sharp-cornered grid-line background showing
        // through at each corner. `w-full`/height still come from the
        // grid track itself (this button fills its cell), so the inset
        // costs 2px total, not a second, hand-tuned size.
        'group relative m-px flex flex-col items-start overflow-hidden rounded-[7px] border-l-[3px] text-left transition-[transform,box-shadow] duration-150',
        rowSpan === 1 ? 'gap-0 px-[7px] py-[5px]' : 'gap-0.5 px-[9px] py-[7px]',
        'hover:z-20 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(20,24,40,.12)]',
        // The global :focus-visible ring draws with a positive 2px
        // outline-offset, which lands entirely outside this button's own
        // box -- and this button is deliberately overflow-hidden (to clip
        // text that doesn't fit the fixed row height), which would clip the
        // ring itself away to nothing. An inset ring always stays within
        // the button's own painted area.
        'focus-visible:outline-offset-[-2px]',
      )}
    >
      <span className="flex w-full min-w-0 items-center gap-1 text-[13px] font-bold leading-[16px]">
        {booking.isOwnBooking && (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0"
            style={{ color: titleColor }}
          >
            <path
              d="M3 8.5 6.2 11.5 13 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        <span aria-hidden="true" className="truncate" style={{ color: titleColor }}>
          {booking.title}
        </span>
      </span>
      {/* Author-or-"You" on one line: a 30-minute (rowSpan 1) block's
          content box only has ~26px after the padding above, and this
          single line is what fits alongside the title within that budget
          -- see the accessible-name comment above for how the complete
          title/author/time triple still reaches assistive tech even when
          this is the only secondary line shown. */}
      <span
        aria-hidden="true"
        className="w-full truncate text-[11px] font-medium leading-none"
        style={{ color: titleColor }}
      >
        {booking.isOwnBooking ? 'You' : booking.authorName}
      </span>
      {/* Time line: only once there's a second row's worth of height to
          spend on it (a 30-minute/rowSpan-1 block never has room) -- the
          slot's own vertical position against the time rail already
          communicates its time for that case, and the full range remains
          in the accessible name and the detail dialog. */}
      {rowSpan >= 2 && (
        <span
          aria-hidden="true"
          className="tabular-nums text-[11px] font-medium leading-none"
          style={{ color: titleColor }}
        >
          {startLabel}–{endLabel}
        </span>
      )}
      {currentTimeFraction !== undefined && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-current-time"
          style={{ top: `${currentTimeFraction * 100}%` }}
        />
      )}
    </button>
  );
}
