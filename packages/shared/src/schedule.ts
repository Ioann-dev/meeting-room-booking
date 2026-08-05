import { DateTime } from 'luxon';
import { OFFICE_CLOSE_HOUR, OFFICE_OPEN_HOUR, OFFICE_TIMEZONE, SLOT_MINUTES } from './office';
import { getDurationMinutes, getOfficeWeekBoundaries, toZonedParts, type Instant } from './time';
import type { WeekBoundaries } from './time';

/**
 * The weekly grid's day columns and half-hour rows are identified by
 * office-local calendar date/time, never the viewer's browser zone -- so a
 * column's identity (which office-local day it is) and a week's boundaries
 * stay fixed regardless of who is looking at them. Only the *labels* shown
 * for an individual booking (not the grid's structure) are converted to the
 * viewer's zone, entirely in `apps/web` using `toZonedParts`.
 */
export interface OfficeWeekDay {
  year: number;
  month: number;
  day: number;
  /** ISO weekday: 1 = Monday .. 7 = Sunday. */
  weekday: number;
}

/** The 7 office-local calendar dates making up the week starting at `weekStartUtc`. */
export function getOfficeWeekDays(
  weekStartUtc: Instant,
  zone: string = OFFICE_TIMEZONE,
): OfficeWeekDay[] {
  const start = toZonedParts(weekStartUtc, zone);
  const startDate = DateTime.fromObject(
    { year: start.year, month: start.month, day: start.day },
    { zone },
  );
  return Array.from({ length: 7 }, (_, i) => {
    const d = startDate.plus({ days: i });
    return { year: d.year, month: d.month, day: d.day, weekday: d.weekday };
  });
}

export interface OfficeSlot {
  /** 0-based row index for this half-hour slot within the office day. */
  rowIndex: number;
  hour: number;
  minute: number;
}

/** The office-local half-hour slot rows between `openHour` and `closeHour`. */
export function getOfficeSlots(
  openHour: number = OFFICE_OPEN_HOUR,
  closeHour: number = OFFICE_CLOSE_HOUR,
  slotMinutes: number = SLOT_MINUTES,
): OfficeSlot[] {
  const totalMinutes = (closeHour - openHour) * 60;
  const rowCount = totalMinutes / slotMinutes;
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const minutesFromOpen = rowIndex * slotMinutes;
    return {
      rowIndex,
      hour: openHour + Math.floor(minutesFromOpen / 60),
      minute: minutesFromOpen % 60,
    };
  });
}

/** Whole office-local calendar days between two zoned wall-clock dates (can be negative). */
function diffInOfficeCalendarDays(
  fromYear: number,
  fromMonth: number,
  fromDay: number,
  toYear: number,
  toMonth: number,
  toDay: number,
  zone: string,
): number {
  const from = DateTime.fromObject({ year: fromYear, month: fromMonth, day: fromDay }, { zone });
  const to = DateTime.fromObject({ year: toYear, month: toMonth, day: toDay }, { zone });
  return Math.round(to.diff(from, 'days').days);
}

export interface BookingPosition {
  /** 0 = Monday's column .. 6 = Sunday's column. */
  dayIndex: number;
  /** 0-based office-local row this booking starts on. */
  rowStart: number;
  /** Number of half-hour rows this booking spans. */
  rowSpan: number;
}

/**
 * Where a booking's UTC `[startAt, endAt)` instant belongs in the office-local
 * grid, or `null` if its start falls outside the visible week's 7 days (not
 * expected for bookings the schedule endpoint already scoped to this week,
 * but callers get an explicit signal instead of a garbage index).
 */
export function getBookingPosition(
  startAt: Instant,
  endAt: Instant,
  weekStartUtc: Instant,
  zone: string = OFFICE_TIMEZONE,
  openHour: number = OFFICE_OPEN_HOUR,
  slotMinutes: number = SLOT_MINUTES,
): BookingPosition | null {
  const weekStart = toZonedParts(weekStartUtc, zone);
  const start = toZonedParts(startAt, zone);

  const dayIndex = diffInOfficeCalendarDays(
    weekStart.year,
    weekStart.month,
    weekStart.day,
    start.year,
    start.month,
    start.day,
    zone,
  );
  if (dayIndex < 0 || dayIndex > 6) {
    return null;
  }

  const rowStart = Math.round((start.hour * 60 + start.minute - openHour * 60) / slotMinutes);
  const rowSpan = Math.round(getDurationMinutes(startAt, endAt) / slotMinutes);

  return { dayIndex, rowStart, rowSpan };
}

/** Which column (if any) is "today" for the currently visible office week. */
export function getTodayDayIndex(
  now: Instant,
  weekStartUtc: Instant,
  zone: string = OFFICE_TIMEZONE,
): number | null {
  const weekStart = toZonedParts(weekStartUtc, zone);
  const current = toZonedParts(now, zone);
  const dayIndex = diffInOfficeCalendarDays(
    weekStart.year,
    weekStart.month,
    weekStart.day,
    current.year,
    current.month,
    current.day,
    zone,
  );
  return dayIndex >= 0 && dayIndex <= 6 ? dayIndex : null;
}

export interface CurrentTimePosition {
  dayIndex: number;
  /** Fractional row offset from the top of the office day (e.g. 2.5 = halfway through the 3rd slot). */
  rowOffset: number;
}

/**
 * Where the current-time line belongs, or `null` when "now" falls outside
 * the visible week or outside office hours (no line to draw either way).
 */
export function getCurrentTimePosition(
  now: Instant,
  weekStartUtc: Instant,
  zone: string = OFFICE_TIMEZONE,
  openHour: number = OFFICE_OPEN_HOUR,
  closeHour: number = OFFICE_CLOSE_HOUR,
  slotMinutes: number = SLOT_MINUTES,
): CurrentTimePosition | null {
  const dayIndex = getTodayDayIndex(now, weekStartUtc, zone);
  if (dayIndex === null) {
    return null;
  }

  const current = toZonedParts(now, zone);
  const minutesFromOpen = current.hour * 60 + current.minute - openHour * 60;
  const totalMinutes = (closeHour - openHour) * 60;
  if (minutesFromOpen < 0 || minutesFromOpen > totalMinutes) {
    return null;
  }

  return { dayIndex, rowOffset: minutesFromOpen / slotMinutes };
}

/**
 * The office week immediately before or after the one starting at
 * `currentWeekStartUtc`, computed by shifting the office-local calendar date
 * a full week and re-deriving boundaries through `getOfficeWeekBoundaries` --
 * the same DST-safe path the server already uses -- rather than adding a
 * fixed `7 * 24h` in UTC. Shifting at local noon (not midnight) sidesteps any
 * theoretical ambiguity around a DST transition landing exactly at midnight.
 */
export function getAdjacentOfficeWeek(
  currentWeekStartUtc: Instant,
  direction: 'previous' | 'next',
  zone: string = OFFICE_TIMEZONE,
): WeekBoundaries {
  const start = toZonedParts(currentWeekStartUtc, zone);
  const offsetDays = direction === 'next' ? 7 : -7;
  const shifted = DateTime.fromObject(
    { year: start.year, month: start.month, day: start.day, hour: 12 },
    { zone },
  ).plus({ days: offsetDays });
  return getOfficeWeekBoundaries(shifted.toJSDate(), zone);
}
