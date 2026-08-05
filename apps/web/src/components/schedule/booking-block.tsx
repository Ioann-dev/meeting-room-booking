'use client';

import type { BookingSummary } from 'shared';
import { cn } from '@/lib/cn';

interface BookingBlockProps {
  booking: BookingSummary;
  rowSpan: number;
  startLabel: string;
  endLabel: string;
  onSelect: (booking: BookingSummary) => void;
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
    <td rowSpan={rowSpan} className="relative border-b border-border p-0 align-top">
      <button
        type="button"
        onClick={() => onSelect(booking)}
        className={cn(
          'flex h-full min-h-8 w-full flex-col items-start gap-0.5 border-l-2 px-2 py-1.5 text-left transition-colors',
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
        <span className="tabular-nums text-[11px] text-ink-faint">
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
