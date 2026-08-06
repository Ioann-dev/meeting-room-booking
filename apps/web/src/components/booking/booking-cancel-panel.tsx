'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-error';
import { cancelBooking, cancelBookingSeries } from '@/lib/booking-client';
import { bookingErrorMessage } from '@/lib/booking-error-copy';

export type CancelScope = 'single' | 'occurrence' | 'series';

interface BookingCancelPanelProps {
  booking: { id: string; seriesId: string | null };
  /** Called after a successful cancel; the caller closes/refreshes/toasts (scope picks its wording). */
  onCancelled: (scope: CancelScope) => void;
  onKeepBooking: () => void;
}

/**
 * The confirm-and-cancel UI shared by the schedule's booking-detail dialog
 * and the My Bookings page: a plain booking gets a single confirm, a
 * booking with `seriesId` set offers "this occurrence" vs "entire series"
 * as two equally-weighted destructive choices (neither should look
 * "safer" and bias the click) plus "Keep booking". Owns its own
 * pending/error state and the actual cancelBooking/cancelBookingSeries
 * calls, so both call sites get identical behavior for free.
 */
export function BookingCancelPanel({
  booking,
  onCancelled,
  onKeepBooking,
}: BookingCancelPanelProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);

  // This component is only ever mounted at the moment it should receive
  // focus (both call sites mount it fresh rather than toggling a `view`
  // prop on an already-mounted instance), so a plain mount-time focus is
  // enough -- no dependency on an external "did the view just change" signal.
  useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);

  async function handleCancel(action: () => Promise<void>, scope: CancelScope) {
    setError(null);
    setPending(true);
    try {
      await action();
      onCancelled(scope);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? bookingErrorMessage(caught)
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert variant="error">{error}</Alert>}
      {booking.seriesId ? (
        <>
          <p className="text-sm text-ink">
            This booking is part of a recurring series. What would you like to cancel?
          </p>
          <div className="flex flex-col gap-2">
            <Button
              ref={firstButtonRef}
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onKeepBooking}
              className="w-full"
            >
              Keep booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={pending}
              onClick={() => void handleCancel(() => cancelBooking(booking.id), 'occurrence')}
              className="w-full"
            >
              Cancel this occurrence
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={pending}
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
              ref={firstButtonRef}
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onKeepBooking}
            >
              Keep booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={pending}
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
