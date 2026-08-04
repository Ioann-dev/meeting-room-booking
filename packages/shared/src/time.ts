import { DateTime } from 'luxon';
import {
  MAX_BOOKING_DURATION_MINUTES,
  MIN_BOOKING_DURATION_MINUTES,
  OFFICE_CLOSE_HOUR,
  OFFICE_OPEN_HOUR,
  OFFICE_TIMEZONE,
  SLOT_MINUTES,
} from './office';

/**
 * An absolute instant, as it travels between layers: a `Date` coming out of
 * Prisma, or an ISO-8601 string coming out of JSON. Both represent the same
 * unambiguous point in time regardless of any process/machine local zone.
 */
export type Instant = Date | string;

export interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface ZonedParts extends WallTime {
  /** ISO weekday: 1 = Monday, 7 = Sunday. Locale-independent. */
  weekday: number;
  /** Minutes east of UTC for this instant in this zone (e.g. 180 for Kyiv in EEST). */
  offsetMinutes: number;
  zone: string;
}

export interface WeekBoundaries {
  /** Inclusive UTC instant of the office-local week start (Monday 00:00). */
  startUtc: string;
  /** Exclusive UTC instant of the office-local week end (next Monday 00:00). */
  endUtc: string;
}

function toDateTime(instant: Instant): DateTime {
  // `{ zone: 'utc' }` also governs how a naive (offset-less) ISO string
  // would be interpreted; every `Instant` this module receives is expected
  // to carry an explicit offset/`Z`, but pinning this keeps parsing from
  // ever depending on the host process's local zone.
  const dt =
    instant instanceof Date
      ? DateTime.fromJSDate(instant, { zone: 'utc' })
      : DateTime.fromISO(instant, { zone: 'utc' });
  if (!dt.isValid) {
    throw new Error(
      `Invalid instant "${String(instant)}": ${dt.invalidReason ?? 'unknown reason'}`,
    );
  }
  return dt;
}

function requireIso(dt: DateTime): string {
  const iso = dt.toUTC().toISO();
  if (!iso) {
    throw new Error('Failed to format a valid DateTime as ISO -- this should be unreachable');
  }
  return iso;
}

/**
 * Converts office-local (or any IANA zone's) wall-clock time to the UTC
 * instant it represents. The zone, not a fixed offset, resolves whether
 * that wall time falls in standard or daylight-saving time.
 */
export function zonedWallTimeToUtc(wallTime: WallTime, zone: string): string {
  const dt = DateTime.fromObject(
    {
      year: wallTime.year,
      month: wallTime.month,
      day: wallTime.day,
      hour: wallTime.hour,
      minute: wallTime.minute,
      second: 0,
      millisecond: 0,
    },
    { zone },
  );
  if (!dt.isValid) {
    throw new Error(
      `Invalid wall time for zone "${zone}": ${dt.invalidReason ?? 'unknown reason'}`,
    );
  }
  return requireIso(dt);
}

/** Converts a UTC instant to its wall-clock representation in the given IANA zone. */
export function toZonedParts(instant: Instant, zone: string): ZonedParts {
  const dt = toDateTime(instant).setZone(zone);
  if (!dt.isValid) {
    throw new Error(
      `Cannot convert instant to zone "${zone}": ${dt.invalidReason ?? 'unknown reason'}`,
    );
  }
  return {
    year: dt.year,
    month: dt.month,
    day: dt.day,
    hour: dt.hour,
    minute: dt.minute,
    weekday: dt.weekday,
    offsetMinutes: dt.offset,
    zone,
  };
}

/**
 * The office-local Monday-to-Monday week containing `referenceInstant`, as
 * a UTC instant pair. Computed by anchoring in the office zone and adding a
 * week there (not by adding a fixed 7×24h in UTC), so the boundary is
 * correct even for a week that crosses a Kyiv DST transition.
 */
export function getOfficeWeekBoundaries(
  referenceInstant: Instant,
  zone: string = OFFICE_TIMEZONE,
): WeekBoundaries {
  const local = toDateTime(referenceInstant).setZone(zone);
  const daysSinceMonday = local.weekday - 1;
  const weekStartLocal = local.minus({ days: daysSinceMonday }).startOf('day');
  const weekEndLocal = weekStartLocal.plus({ weeks: 1 });
  return { startUtc: requireIso(weekStartLocal), endUtc: requireIso(weekEndLocal) };
}

/**
 * True when `instant`, viewed as wall-clock time in `zone`, falls on a
 * `slotMinutes` boundary (e.g. :00 or :30 for the default 30-minute slot).
 * Checked in the target zone rather than on the raw UTC minute so this is
 * correct even for zones with non-whole-hour offsets.
 */
export function isAlignedToSlot(
  instant: Instant,
  zone: string,
  slotMinutes: number = SLOT_MINUTES,
): boolean {
  const dt = toDateTime(instant).setZone(zone);
  return dt.second === 0 && dt.millisecond === 0 && dt.minute % slotMinutes === 0;
}

export function getDurationMinutes(startInstant: Instant, endInstant: Instant): number {
  const start = toDateTime(startInstant);
  const end = toDateTime(endInstant);
  return end.diff(start, 'minutes').minutes;
}

export function isValidDuration(
  startInstant: Instant,
  endInstant: Instant,
  bounds: { minMinutes?: number; maxMinutes?: number } = {},
): boolean {
  const minMinutes = bounds.minMinutes ?? MIN_BOOKING_DURATION_MINUTES;
  const maxMinutes = bounds.maxMinutes ?? MAX_BOOKING_DURATION_MINUTES;
  const durationMinutes = getDurationMinutes(startInstant, endInstant);
  return durationMinutes >= minMinutes && durationMinutes <= maxMinutes;
}

/**
 * True when half-open intervals [aStart, aEnd) and [bStart, bEnd) share
 * any instant. Two intervals overlap iff `aStart < bEnd && bStart < aEnd`
 * (see docs/decisions/0001-booking-overlap.md) -- adjacency (one interval
 * ending exactly when the other starts) falls out of this definition
 * automatically rather than needing a special-cased exception, since
 * `11:00 < 11:00` is false.
 */
export function intervalsOverlap(
  aStart: Instant,
  aEnd: Instant,
  bStart: Instant,
  bEnd: Instant,
): boolean {
  const a1 = toDateTime(aStart);
  const a2 = toDateTime(aEnd);
  const b1 = toDateTime(bStart);
  const b2 = toDateTime(bEnd);
  return a1 < b2 && b1 < a2;
}

/**
 * True when the half-open interval [start, end) falls entirely within
 * [openHour, closeHour) office-local wall-clock time on the day `start`
 * falls on. Re-derives office-local time from the UTC instants on every
 * call, so a caller cannot smuggle a browser-zone bypass of office hours by
 * labeling instants differently -- only the zone parameter controls this.
 */
export function isWithinOfficeHours(
  startInstant: Instant,
  endInstant: Instant,
  zone: string = OFFICE_TIMEZONE,
  openHour: number = OFFICE_OPEN_HOUR,
  closeHour: number = OFFICE_CLOSE_HOUR,
): boolean {
  const start = toDateTime(startInstant).setZone(zone);
  const end = toDateTime(endInstant).setZone(zone);

  if (end <= start) {
    return false;
  }

  const dayStart = start.set({ hour: openHour, minute: 0, second: 0, millisecond: 0 });
  const dayEnd = start.set({ hour: closeHour, minute: 0, second: 0, millisecond: 0 });

  return start >= dayStart && end <= dayEnd;
}
