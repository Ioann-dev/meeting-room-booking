'use client';

import type { CSSProperties } from 'react';
import type { BookingSummary } from 'shared';
import { cn } from '@/lib/cn';

interface BookingBlockProps {
  booking: BookingSummary;
  rowSpan: number;
  startLabel: string;
  endLabel: string;
  onSelect: (booking: BookingSummary, trigger: HTMLButtonElement) => void;
  /** 0-1 fraction of this block's height where the current-time line falls, if it does. */
  currentTimeFraction?: number;
}

export function BookingBlock({
  booking,
  rowSpan,
  startLabel,
  endLabel,
  onSelect,
  currentTimeFraction,
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

  return (
    <td rowSpan={rowSpan} className="relative overflow-hidden border-b border-border p-0 align-top">
      <button
        type="button"
        onClick={(event) => onSelect(booking, event.currentTarget)}
        aria-label={accessibleName}
        style={{ '--row-span': rowSpan } as CSSProperties}
        className={cn(
          // A booking's own content (long title, dense metadata) must never
          // be what determines this row's height -- min+max pinned to the
          // same calc() value (rather than a single fixed `height`) keeps
          // this cooperating with a table row that a *different* cell makes
          // taller (e.g. the time-rail's own two-line zone label), while
          // still making it impossible for this button's own content to be
          // the thing that inflates it. overflow-hidden clips whatever
          // doesn't fit; the two half-hour-unit values (2.75rem/2rem) are
          // the same narrow/desktop numbers SlotCell uses.
          //
          // rowSpan x unit alone undercounts the true row pitch: adjacent
          // rows each contribute a 1px border-b (collapsed, not doubled),
          // so N spanned rows measure N*unit + (N-1)*1px top-to-bottom, not
          // N*unit. Left uncorrected this is a deterministic, duration-
          // dependent shortfall (0.5px at 30min growing to 7.5px at 4h),
          // not sub-pixel rounding -- adding (rowSpan-1)*1px closes it,
          // leaving only a constant, non-growing ~0.5px remainder.
          'flex w-full flex-col items-start overflow-hidden border-l-2 px-2 py-1 text-left transition-colors',
          // The global :focus-visible ring (globals.css) draws with a
          // positive 2px outline-offset, which lands entirely outside this
          // button's own box -- and both this button and its parent <td>
          // are deliberately overflow-hidden (to clip/truncate text that
          // doesn't fit the fixed row height), which was silently clipping
          // the ring itself away to nothing. An inset ring (negative
          // offset) always stays within the button's own painted area, so
          // it can never be a candidate for that clip regardless of how
          // tightly this cell is sized.
          'focus-visible:outline-offset-[-2px]',
          rowSpan === 1 ? 'gap-0' : 'gap-0.5',
          'min-h-[calc(2.75rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
          'max-h-[calc(2.75rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
          'md:min-h-[calc(2rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
          'md:max-h-[calc(2rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
          booking.isOwnBooking
            ? 'border-l-accent bg-accent-tint hover:bg-accent-tint/70'
            : 'border-l-transparent bg-canvas hover:bg-border/40',
        )}
      >
        <span className="flex w-full min-w-0 items-center gap-1 text-[11px] font-semibold leading-none text-ink">
          {booking.isOwnBooking && (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 text-accent-strong"
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
          <span aria-hidden="true" className="truncate">
            {booking.title}
          </span>
        </span>
        {/* Author-or-"You" on one line: a 30-minute (rowSpan 1) block's
            content box only has ~24px after the padding above, and this
            single line is what fits alongside the title within that
            budget -- see the accessible-name comment above for how the
            complete title/author/time triple still reaches assistive
            tech even when this is the only secondary line shown.
            ink-subtle, not ink-faint, for the other-user case: this
            block's own-booking background is accent-tint, noticeably
            darker than the surface/canvas backgrounds ink-faint is
            calibrated against -- ink-faint text here fails WCAG AA
            contrast (~4.47:1 of the required 4.5:1), caught by the
            schedule page's automated a11y check. */}
        <span
          aria-hidden="true"
          className={cn(
            'w-full truncate text-[10px] leading-none',
            booking.isOwnBooking ? 'font-medium text-accent-strong' : 'text-ink-subtle',
          )}
        >
          {booking.isOwnBooking ? 'You' : booking.authorName}
        </span>
        {/* Time line: only once there's a second row's worth of height to
            spend on it (a 30-minute/rowSpan-1 block never has room) -- the
            slot's own vertical position against the time rail already
            communicates its time for that case, and the full range
            remains in the accessible name and the detail dialog. */}
        {rowSpan >= 2 && (
          <span
            aria-hidden="true"
            className="tabular-nums text-[10px] leading-none text-ink-subtle"
          >
            {startLabel}–{endLabel}
          </span>
        )}
      </button>
      {currentTimeFraction !== undefined && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t-2 border-accent-strong"
          style={{ top: `${currentTimeFraction * 100}%` }}
        />
      )}
    </td>
  );
}
