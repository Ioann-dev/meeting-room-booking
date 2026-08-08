'use client';

import { useState } from 'react';
import type { BookingSummary } from 'shared';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { BookingCancelPanel, type CancelScope } from '@/components/booking/booking-cancel-panel';

interface BookingTimeLabels {
  browserStartLabel: string;
  browserEndLabel: string;
  /** Whole-day offset of browserStartLabel's date from the Kyiv-anchored booking date; 0 if the same day. */
  browserStartDayOffset: number;
  /** Whole-day offset of browserEndLabel's date from the Kyiv-anchored booking date; 0 if the same day. */
  browserEndDayOffset: number;
  officeStartLabel: string;
  officeEndLabel: string;
  showOfficeEquivalent: boolean;
}

interface BookingDetailDialogProps extends BookingTimeLabels {
  booking: BookingSummary | null;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  /** Called after a successful cancel; the caller closes the dialog, refreshes the schedule, and shows a toast (scope picks its wording). */
  onCancelled: (scope: CancelScope) => void;
}

function DayOffsetNote({ offsetDays }: { offsetDays: number }) {
  if (offsetDays === 0) {
    return null;
  }
  return (
    <span className="ml-0.5 whitespace-nowrap text-xs font-normal text-ink-subtle">
      ({offsetDays > 0 ? `+${offsetDays}` : offsetDays}d)
    </span>
  );
}

interface BookingDetailContentProps extends BookingTimeLabels {
  booking: BookingSummary;
  onCancelled: (scope: CancelScope) => void;
}

function BookingDetailContent({
  booking,
  onCancelled,
  browserStartLabel,
  browserEndLabel,
  browserStartDayOffset,
  browserEndDayOffset,
  officeStartLabel,
  officeEndLabel,
  showOfficeEquivalent,
}: BookingDetailContentProps) {
  const [view, setView] = useState<'detail' | 'confirm'>('detail');

  if (view === 'confirm') {
    return (
      <BookingCancelPanel
        booking={booking}
        onCancelled={onCancelled}
        onKeepBooking={() => setView('detail')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Ownership stated up front, as a badge rather than a third dl row --
          it's the single fact this dialog exists to disambiguate (whose
          booking is this), so it earns top billing alongside the title
          instead of competing for attention with Booked-by/Time further
          down. Icon + label + tint, the same non-color-alone signal the
          schedule grid's own booking blocks use for the identical fact. */}
      <div
        className={cn(
          'inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
          // Teal, not the general primary/accent color -- ownership on the
          // calendar itself (BookingBlock's own teal treatment, the
          // current-time indicator) is already teal's one reserved
          // meaning app-wide; this badge was the one place still using
          // the general violet accent for the same fact, which read as
          // two different colors claiming the same "this is yours"
          // signal depending on which screen you were on.
          booking.isOwnBooking ? 'bg-teal-soft text-[#0A675A]' : 'bg-surface-muted text-ink-subtle',
        )}
      >
        {booking.isOwnBooking && (
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3 w-3">
            <path
              d="M3 8.5 6.2 11.5 13 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {booking.isOwnBooking ? 'Your booking' : "Another attendee's booking"}
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-subtle">Booked by</dt>
          <dd className="font-medium text-ink">{booking.authorName}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-subtle">Time</dt>
          <dd className="text-right font-medium text-ink">
            <span className="tabular-nums">
              {browserStartLabel}
              <DayOffsetNote offsetDays={browserStartDayOffset} />
              {'–'}
              {browserEndLabel}
              <DayOffsetNote offsetDays={browserEndDayOffset} />
            </span>
            {showOfficeEquivalent && (
              <span className="block text-xs font-normal tabular-nums text-ink-subtle">
                {officeStartLabel}–{officeEndLabel} Europe/Kyiv
              </span>
            )}
          </dd>
        </div>
        {booking.seriesId && (
          <p className="flex items-center gap-1.5 rounded-md bg-surface-muted px-3 py-2 text-xs text-ink-subtle">
            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-3 w-3 shrink-0">
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
            Part of a recurring booking.
          </p>
        )}
      </dl>
      {booking.isOwnBooking && (
        <div className="flex justify-end">
          <Button type="button" variant="destructive" onClick={() => setView('confirm')}>
            Cancel booking
          </Button>
        </div>
      )}
    </div>
  );
}

export function BookingDetailDialog({
  booking,
  onOpenChange,
  onCloseAutoFocus,
  onCancelled,
  ...timeLabels
}: BookingDetailDialogProps) {
  return (
    <Dialog
      open={booking !== null}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title={booking?.title ?? 'Booking'}
      // This dialog is the one place in the app that can legitimately have
      // no action button at all (viewing another attendee's read-only
      // booking) -- give it an explicit, visible close control rather than
      // leaving Escape/backdrop-click as the only, undiscoverable way out.
      showCloseButton
    >
      {/* Rendered only while a booking is selected, and re-keyed per
          booking id: guarantees a fresh mount (detail view, no stale
          confirm state) every time a different booking is opened, instead
          of an effect reaching back into already-mounted state. */}
      {booking && (
        <BookingDetailContent
          key={booking.id}
          booking={booking}
          onCancelled={onCancelled}
          {...timeLabels}
        />
      )}
    </Dialog>
  );
}
