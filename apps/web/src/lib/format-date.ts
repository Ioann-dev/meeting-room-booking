export const WEEKDAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_LABELS_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const MONTH_ABBREV = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "03 Aug" -- the day+month grammar shared by day headers, week ranges, and full dates. */
export function formatDayMonth(month: number, day: number): string {
  return `${pad2(day)} ${MONTH_ABBREV[month - 1]}`;
}

/** "03–09 Aug 2026" / "29 Aug – 04 Sep 2026" / "29 Dec 2026 – 04 Jan 2027". */
export function formatWeekRangeLabel(
  first: { year: number; month: number; day: number },
  last: { year: number; month: number; day: number },
): string {
  if (first.year === last.year && first.month === last.month) {
    return `${pad2(first.day)}–${pad2(last.day)} ${MONTH_ABBREV[first.month - 1]} ${last.year}`;
  }
  if (first.year === last.year) {
    return `${formatDayMonth(first.month, first.day)} – ${formatDayMonth(last.month, last.day)} ${last.year}`;
  }
  return `${formatDayMonth(first.month, first.day)} ${first.year} – ${formatDayMonth(last.month, last.day)} ${last.year}`;
}

/**
 * "Saturday, 08 Aug 2026" -- the one full-date convention used in prose
 * (booking confirmations, My Bookings). Shares the day+month grammar with
 * the week-range and day-header labels so all three read as one consistent
 * date "voice".
 */
export function formatFullDateLabel(
  weekdayLong: string,
  month: number,
  day: number,
  year: number,
): string {
  return `${weekdayLong}, ${formatDayMonth(month, day)} ${year}`;
}

/**
 * "Monday, 03.08.2026" -- the booking-form Date <select>'s option labels
 * only. Deliberately a different (dotted-numeric) grammar from
 * formatFullDateLabel: compact and scannable in a narrow control, not a
 * variant of the prose format.
 */
export function formatSelectDateLabel(
  weekdayLong: string,
  month: number,
  day: number,
  year: number,
): string {
  return `${weekdayLong}, ${pad2(day)}.${pad2(month)}.${year}`;
}
