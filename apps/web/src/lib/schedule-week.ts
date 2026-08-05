import { OFFICE_TIMEZONE, toZonedParts, zonedWallTimeToUtc } from 'shared';

const WEEK_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

/**
 * Converts a `week` URL search param (an office-local ISO calendar date,
 * e.g. "2026-08-03") into the UTC instant the schedule API expects as
 * `referenceDate`. Returns `undefined` for a missing/invalid param.
 */
export function weekParamToReferenceDate(weekParam: string | null): string | undefined {
  if (!weekParam || !WEEK_PARAM_PATTERN.test(weekParam)) {
    return undefined;
  }
  // WEEK_PARAM_PATTERN already guarantees exactly 3 numeric segments.
  const parts = weekParam.split('-').map(Number) as [number, number, number];
  const [year, month, day] = parts;
  try {
    return zonedWallTimeToUtc({ year, month, day, hour: 0, minute: 0 }, OFFICE_TIMEZONE);
  } catch {
    return undefined;
  }
}

/** Converts an office-local week-start UTC instant back into its `week` URL search param. */
export function weekStartToWeekParam(weekStartUtc: string): string {
  const { year, month, day } = toZonedParts(weekStartUtc, OFFICE_TIMEZONE);
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** Today's office-local calendar date, as a `week` URL search param. */
export function todayWeekParam(): string {
  const { year, month, day } = toZonedParts(new Date().toISOString(), OFFICE_TIMEZONE);
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}
