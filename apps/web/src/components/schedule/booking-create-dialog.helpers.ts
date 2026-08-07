import {
  getDurationMinutes,
  getOfficeSlots,
  getZonedDateOffsetDays,
  toZonedParts,
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

/**
 * The label's primary time is always `displayZone`'s own wall clock (per
 * the participant spec's "all times are displayed in the user's browser
 * time zone" requirement), never the Kyiv office time on its own. When the
 * viewer's zone differs from Kyiv, the office-local time is appended as
 * secondary context, and a day-offset suffix flags when the viewer-local
 * calendar date differs from the Kyiv business day these slots belong to --
 * e.g. a Kyiv 09:00 boundary can land on the previous or next viewer-local
 * date for a distant zone, and the option must not silently look like it
 * belongs to the picked Kyiv day.
 */
function formatTimeOptionLabel(
  instant: string,
  officeHour: number,
  officeMinute: number,
  displayZone: string,
): string {
  const viewerParts = toZonedParts(instant, displayZone);
  const viewerLabel = formatClock(viewerParts.hour, viewerParts.minute);
  if (displayZone === OFFICE_TIMEZONE) {
    return viewerLabel;
  }
  const dayOffset = getZonedDateOffsetDays(instant, displayZone, OFFICE_TIMEZONE);
  const offsetSuffix = dayOffset !== 0 ? ` (${dayOffset > 0 ? '+' : ''}${dayOffset}d)` : '';
  return `${viewerLabel}${offsetSuffix} · Office ${formatClock(officeHour, officeMinute)}`;
}

/** Every selectable clock boundary in a day: each 30-minute slot start, plus office close. */
function dayBoundaries(day: OfficeWeekDay, displayZone: string): TimeOption[] {
  const slots = getOfficeSlots().map((slot) => ({ hour: slot.hour, minute: slot.minute }));
  const boundaries = [...slots, { hour: OFFICE_CLOSE_HOUR, minute: 0 }];
  return boundaries.map(({ hour, minute }) => {
    const instant = zonedWallTimeToUtc(
      { year: day.year, month: day.month, day: day.day, hour, minute },
      OFFICE_TIMEZONE,
    );
    return { instant, label: formatTimeOptionLabel(instant, hour, minute, displayZone) };
  });
}

/**
 * Selectable start times for `day`: every office-hour slot boundary except
 * the closing boundary itself (a booking can't start when the office
 * closes), further narrowed to exclude anything at or before `now` so a
 * user can't select an already-past slot in the picker only to have the
 * server reject it -- the server's own PAST_START check remains the actual
 * authority for the boundary, this just keeps the common case pleasant.
 * `day` itself is always the Kyiv office-local business day being browsed
 * -- only each option's displayed *label* is expressed in `displayZone`.
 */
export function buildStartOptions(
  day: OfficeWeekDay,
  now: string | null,
  displayZone: string = OFFICE_TIMEZONE,
): TimeOption[] {
  return dayBoundaries(day, displayZone)
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
export function buildEndOptions(
  day: OfficeWeekDay,
  startInstant: string,
  displayZone: string = OFFICE_TIMEZONE,
): TimeOption[] {
  return dayBoundaries(day, displayZone).filter(
    (option) =>
      option.instant > startInstant &&
      getDurationMinutes(startInstant, option.instant) <= MAX_BOOKING_DURATION_MINUTES,
  );
}
