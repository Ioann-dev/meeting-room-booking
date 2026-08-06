'use client';

import { useState, type FormEvent } from 'react';
import {
  BOOKING_TITLE_MAX_LENGTH,
  BOOKING_TITLE_MIN_LENGTH,
  getOfficeWeekDays,
  OFFICE_TIMEZONE,
  RECURRENCE_MAX_OCCURRENCES,
  RECURRENCE_MIN_OCCURRENCES,
  toZonedParts,
  type BookingSeriesSummary,
  type BookingSummary,
  type OfficeWeek,
  type RoomSummary,
} from 'shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError } from '@/lib/api-error';
import { bookingErrorMessage } from '@/lib/booking-error-copy';
import { createBooking } from '@/lib/booking-client';
import { buildEndOptions, buildStartOptions } from './booking-create-dialog.helpers';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface FieldErrors {
  title?: string;
  occurrenceCount?: string;
}

interface Selection {
  dayIndex: number;
  startInstant: string | null;
  endInstant: string | null;
}

/**
 * Resolves the day/start/end the form should open with: the selected
 * slot's day and time if one was given, else today's date (if it falls in
 * the displayed week) with the first available start, else the week's
 * first day. Pure so the form's initial `useState` can call it directly
 * instead of needing an effect to apply it after mount.
 */
function resolveInitialSelection(
  days: OfficeWeek,
  initialSlotStart: string | null,
  now: string | null,
): Selection {
  let dayIndex = 0;
  const target = initialSlotStart ?? now;
  if (target) {
    const parts = toZonedParts(target, OFFICE_TIMEZONE);
    const idx = days.findIndex(
      (d) => d.year === parts.year && d.month === parts.month && d.day === parts.day,
    );
    if (idx !== -1) {
      dayIndex = idx;
    }
  }

  const startOptions = buildStartOptions(days[dayIndex]!, now);
  const startInstant =
    initialSlotStart && startOptions.some((o) => o.instant === initialSlotStart)
      ? initialSlotStart
      : (startOptions[0]?.instant ?? null);
  const endOptions = startInstant ? buildEndOptions(days[dayIndex]!, startInstant) : [];

  return { dayIndex, startInstant, endInstant: endOptions[0]?.instant ?? null };
}

function validate(title: string, recurrenceEnabled: boolean, occurrenceCount: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < BOOKING_TITLE_MIN_LENGTH) {
    errors.title = 'Title is required';
  } else if (trimmedTitle.length > BOOKING_TITLE_MAX_LENGTH) {
    errors.title = `Title must be at most ${BOOKING_TITLE_MAX_LENGTH} characters`;
  }
  if (recurrenceEnabled) {
    const count = Number(occurrenceCount);
    if (
      !Number.isInteger(count) ||
      count < RECURRENCE_MIN_OCCURRENCES ||
      count > RECURRENCE_MAX_OCCURRENCES
    ) {
      errors.occurrenceCount = `Enter a whole number between ${RECURRENCE_MIN_OCCURRENCES} and ${RECURRENCE_MAX_OCCURRENCES}`;
    }
  }
  return errors;
}

interface BookingCreateFormProps {
  room: RoomSummary;
  days: OfficeWeek;
  initialSlotStart: string | null;
  now: string | null;
  emailVerified: boolean;
  onCancel: () => void;
  onCreated: (result: BookingSummary | BookingSeriesSummary) => void;
}

function BookingCreateForm({
  room,
  days,
  initialSlotStart,
  now,
  emailVerified,
  onCancel,
  onCreated,
}: BookingCreateFormProps) {
  const [selection, setSelection] = useState<Selection>(() =>
    resolveInitialSelection(days, initialSlotStart, now),
  );
  const [title, setTitle] = useState('');
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [occurrenceCount, setOccurrenceCount] = useState(String(RECURRENCE_MIN_OCCURRENCES));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { dayIndex, startInstant, endInstant } = selection;
  const startOptions = buildStartOptions(days[dayIndex]!, now);
  const endOptions = startInstant ? buildEndOptions(days[dayIndex]!, startInstant) : [];

  function handleDayChange(nextIndex: number) {
    const nextStartOptions = buildStartOptions(days[nextIndex]!, now);
    const nextStart = nextStartOptions[0]?.instant ?? null;
    const nextEndOptions = nextStart ? buildEndOptions(days[nextIndex]!, nextStart) : [];
    setSelection({
      dayIndex: nextIndex,
      startInstant: nextStart,
      endInstant: nextEndOptions[0]?.instant ?? null,
    });
  }

  function handleStartChange(nextStart: string) {
    const nextEndOptions = buildEndOptions(days[dayIndex]!, nextStart);
    setSelection((current) => ({
      ...current,
      startInstant: nextStart,
      endInstant: nextEndOptions[0]?.instant ?? null,
    }));
  }

  function handleEndChange(nextEnd: string) {
    setSelection((current) => ({ ...current, endInstant: nextEnd }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const errors = validate(title, recurrenceEnabled, occurrenceCount);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !startInstant || !endInstant) {
      return;
    }

    setPending(true);
    try {
      const result = await createBooking({
        roomId: room.id,
        title: title.trim(),
        startAt: startInstant,
        endAt: endInstant,
        recurrence: recurrenceEnabled ? { occurrenceCount: Number(occurrenceCount) } : undefined,
      });
      onCreated(result);
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? bookingErrorMessage(error)
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }

  const noAvailableStarts = startOptions.length === 0;

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
      {!emailVerified && (
        <Alert variant="warning">
          Verify your email to book a room -- check the link we sent when you registered.
        </Alert>
      )}
      {serverError && <Alert variant="error">{serverError}</Alert>}

      <FormField label="Date">
        <Select
          value={String(dayIndex)}
          onChange={(event) => handleDayChange(Number(event.target.value))}
        >
          {days.map((day, index) => (
            <option key={index} value={index}>
              {WEEKDAY_LABELS[day.weekday - 1]} {day.month}/{day.day}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Start"
          hint={noAvailableStarts ? 'No bookable times remain on this day' : undefined}
        >
          <Select
            value={startInstant ?? ''}
            disabled={noAvailableStarts}
            onChange={(event) => handleStartChange(event.target.value)}
          >
            {startOptions.map((option) => (
              <option key={option.instant} value={option.instant}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="End">
          <Select
            value={endInstant ?? ''}
            disabled={endOptions.length === 0}
            onChange={(event) => handleEndChange(event.target.value)}
          >
            {endOptions.map((option) => (
              <option key={option.instant} value={option.instant}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <p className="text-xs text-ink-subtle">Times are shown in the office zone (Europe/Kyiv).</p>

      <FormField label="Title" error={fieldErrors.title}>
        <Input
          name="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={BOOKING_TITLE_MAX_LENGTH}
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-accent"
          checked={recurrenceEnabled}
          onChange={(event) => setRecurrenceEnabled(event.target.checked)}
        />
        Repeat weekly
      </label>

      {recurrenceEnabled && (
        <FormField
          label="Number of occurrences"
          error={fieldErrors.occurrenceCount}
          hint={`Between ${RECURRENCE_MIN_OCCURRENCES} and ${RECURRENCE_MAX_OCCURRENCES}`}
        >
          <Input
            name="occurrenceCount"
            type="number"
            inputMode="numeric"
            min={RECURRENCE_MIN_OCCURRENCES}
            max={RECURRENCE_MAX_OCCURRENCES}
            value={occurrenceCount}
            onChange={(event) => setOccurrenceCount(event.target.value)}
          />
        </FormField>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={pending} disabled={noAvailableStarts || !endInstant}>
          Book room
        </Button>
      </div>
    </form>
  );
}

interface BookingCreateDialogProps {
  open: boolean;
  room: RoomSummary;
  /** Inclusive UTC instant of the currently displayed office-local week start (Monday 00:00). */
  weekStartUtc: string;
  /** UTC ISO instant of the slot the dialog was opened from, or null if opened without one. */
  initialSlotStart: string | null;
  /** UTC ISO instant for "now", resolved client-side only (see the schedule page). */
  now: string | null;
  emailVerified: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onCreated: (result: BookingSummary | BookingSeriesSummary) => void;
}

export function BookingCreateDialog({
  open,
  room,
  weekStartUtc,
  initialSlotStart,
  now,
  emailVerified,
  onOpenChange,
  onCloseAutoFocus,
  onCreated,
}: BookingCreateDialogProps) {
  const days = getOfficeWeekDays(weekStartUtc);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title="Book a room"
      description={room.name}
    >
      {/* Rendered only while open, and re-keyed per slot: guarantees a fresh
          mount (and so fresh initial state from resolveInitialSelection)
          every time the dialog opens, instead of an effect reaching back
          into already-mounted form state. */}
      {open && (
        <BookingCreateForm
          key={initialSlotStart ?? 'no-slot'}
          room={room}
          days={days}
          initialSlotStart={initialSlotStart}
          now={now}
          emailVerified={emailVerified}
          onCancel={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      )}
    </Dialog>
  );
}
