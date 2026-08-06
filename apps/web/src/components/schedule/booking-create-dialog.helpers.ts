import {
  getDurationMinutes,
  getOfficeSlots,
  zonedWallTimeToUtc,
  MAX_BOOKING_DURATION_MINUTES,
  OFFICE_CLOSE_HOUR,
  OFFICE_TIMEZONE,
  type OfficeWeekDay,
} from 'shared';
import { formatClock } from '@/lib/format-clock';

export interface TimeOption {
  instant: string;
  label: string;
}

/** Every selectable clock boundary in a day: each 30-minute slot start, plus office close. */
function dayBoundaries(day: OfficeWeekDay): TimeOption[] {
  const slots = getOfficeSlots().map((slot) => ({ hour: slot.hour, minute: slot.minute }));
  const boundaries = [...slots, { hour: OFFICE_CLOSE_HOUR, minute: 0 }];
  return boundaries.map(({ hour, minute }) => ({
    instant: zonedWallTimeToUtc(
      { year: day.year, month: day.month, day: day.day, hour, minute },
      OFFICE_TIMEZONE,
    ),
    label: formatClock(hour, minute),
  }));
}

/**
 * Selectable start times for `day`: every office-hour slot boundary except
 * the closing boundary itself (a booking can't start when the office
 * closes), further narrowed to exclude anything at or before `now` so a
 * user can't select an already-past slot in the picker only to have the
 * server reject it -- the server's own PAST_START check remains the actual
 * authority for the boundary, this just keeps the common case pleasant.
 */
export function buildStartOptions(day: OfficeWeekDay, now: string | null): TimeOption[] {
  return dayBoundaries(day)
    .slice(0, -1)
    .filter((option) => now === null || option.instant > now);
}

/**
 * Selectable end times for a booking starting at `startInstant` on `day`:
 * every later boundary whose real elapsed duration (via the same
 * `getDurationMinutes` the server's own validation uses) is within
 * MAX_BOOKING_DURATION_MINUTES. Office-hours and slot-alignment are
 * structurally satisfied since every candidate comes from `dayBoundaries`.
 */
export function buildEndOptions(day: OfficeWeekDay, startInstant: string): TimeOption[] {
  return dayBoundaries(day).filter(
    (option) =>
      option.instant > startInstant &&
      getDurationMinutes(startInstant, option.instant) <= MAX_BOOKING_DURATION_MINUTES,
  );
}
