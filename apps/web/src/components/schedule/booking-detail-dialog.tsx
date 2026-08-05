'use client';

import type { BookingSummary } from 'shared';
import { Dialog } from '@/components/ui/dialog';

interface BookingDetailDialogProps {
  booking: BookingSummary | null;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  browserStartLabel: string;
  browserEndLabel: string;
  officeStartLabel: string;
  officeEndLabel: string;
  showOfficeEquivalent: boolean;
}

export function BookingDetailDialog({
  booking,
  onOpenChange,
  onCloseAutoFocus,
  browserStartLabel,
  browserEndLabel,
  officeStartLabel,
  officeEndLabel,
  showOfficeEquivalent,
}: BookingDetailDialogProps) {
  return (
    <Dialog
      open={booking !== null}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title={booking?.title ?? 'Booking'}
    >
      {booking && (
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-subtle">Booked by</dt>
            <dd className="font-medium text-ink">{booking.authorName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-subtle">Time</dt>
            <dd className="text-right font-medium text-ink">
              <span className="tabular-nums">
                {browserStartLabel}–{browserEndLabel}
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
      )}
    </Dialog>
  );
}
