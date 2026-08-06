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
  return (
    <td rowSpan={rowSpan} className="relative overflow-hidden border-b border-border p-0 align-top">
      <button
        type="button"
        onClick={(event) => onSelect(booking, event.currentTarget)}
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
          'flex w-full flex-col items-start gap-0.5 overflow-hidden border-l-2 px-2 py-1.5 text-left transition-colors',
          'min-h-[calc(2.75rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
          'max-h-[calc(2.75rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
          'md:min-h-[calc(2rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
          'md:max-h-[calc(2rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
          booking.isOwnBooking
            ? 'border-l-accent bg-accent-tint hover:bg-accent-tint/70'
            : 'border-l-transparent bg-canvas hover:bg-border/40',
        )}
      >
        <span className="flex w-full min-w-0 items-center gap-1 text-xs font-medium text-ink">
          {booking.isOwnBooking && (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="h-3 w-3 shrink-0 text-accent-strong"
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
          <span className="truncate">{booking.title}</span>
        </span>
        <span className="w-full truncate text-[11px] text-ink-subtle">{booking.authorName}</span>
        {/* ink-subtle, not ink-faint: this block's own-booking background
            is accent-tint, noticeably darker than the surface/canvas
            backgrounds ink-faint is calibrated against -- ink-faint text
            here fails WCAG AA contrast (~4.47:1 of the required 4.5:1),
            caught by the schedule page's automated a11y check. */}
        <span className="tabular-nums text-[11px] text-ink-subtle">
          {startLabel}–{endLabel}
        </span>
        {booking.isOwnBooking && (
          <span className="text-[10px] font-medium text-accent-strong">You</span>
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
