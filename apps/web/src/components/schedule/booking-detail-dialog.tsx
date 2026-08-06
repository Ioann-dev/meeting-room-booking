'use client';

import { useEffect, useRef, useState } from 'react';
import type { BookingSummary } from 'shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ApiError } from '@/lib/api-error';
import { cancelBooking, cancelBookingSeries } from '@/lib/booking-client';
import { bookingErrorMessage } from '@/lib/booking-error-copy';

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
  onCancelled: (scope: 'single' | 'occurrence' | 'series') => void;
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
  onCancelled: (scope: 'single' | 'occurrence' | 'series') => void;
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
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const firstConfirmButtonRef = useRef<HTMLButtonElement | null>(null);

  // Radix's own initial-open focus only applies to the dialog's original
  // mount, not this in-place content swap -- without this, focus stays on
  // whichever element it was on inside the detail view.
  useEffect(() => {
    if (view === 'confirm') {
      firstConfirmButtonRef.current?.focus();
    }
  }, [view]);

  async function handleCancel(
    action: () => Promise<void>,
    scope: 'single' | 'occurrence' | 'series',
  ) {
    setCancelError(null);
    setCancelPending(true);
    try {
      await action();
      onCancelled(scope);
    } catch (error) {
      setCancelError(
        error instanceof ApiError
          ? bookingErrorMessage(error)
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setCancelPending(false);
    }
  }

  if (view === 'detail') {
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

  return (
    <div className="flex flex-col gap-4">
      {cancelError && <Alert variant="error">{cancelError}</Alert>}
      {booking.seriesId ? (
        <>
          <p className="text-sm text-ink">
            This booking is part of a recurring series. What would you like to cancel?
          </p>
          <div className="flex flex-col gap-2">
            <Button
              ref={firstConfirmButtonRef}
              type="button"
              variant="secondary"
              disabled={cancelPending}
              onClick={() => setView('detail')}
              className="w-full"
            >
              Keep booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={cancelPending}
              onClick={() => void handleCancel(() => cancelBooking(booking.id), 'occurrence')}
              className="w-full"
            >
              Cancel this occurrence
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={cancelPending}
              onClick={() =>
                void handleCancel(() => cancelBookingSeries(booking.seriesId!), 'series')
              }
              className="w-full"
            >
              Cancel entire series
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink">Cancel this booking? This can&apos;t be undone.</p>
          <div className="flex justify-end gap-2">
            <Button
              ref={firstConfirmButtonRef}
              type="button"
              variant="secondary"
              disabled={cancelPending}
              onClick={() => setView('detail')}
            >
              Keep booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={cancelPending}
              onClick={() => void handleCancel(() => cancelBooking(booking.id), 'single')}
            >
              Cancel booking
            </Button>
          </div>
        </>
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
          confirm/error state) every time a different booking is opened,
          instead of an effect reaching back into already-mounted state. */}
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
