'use client';

import { useState } from 'react';
import type { BookingSummary } from 'shared';
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
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-subtle">Ownership</dt>
          <dd className="font-medium text-ink">
            {booking.isOwnBooking ? 'Your booking' : "Another attendee's booking"}
          </dd>
        </div>
        {booking.seriesId && (
          <p className="rounded-md bg-canvas px-3 py-2 text-xs text-ink-subtle">
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
