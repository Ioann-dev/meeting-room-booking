import { getInstantRangeDayOffset, toZonedParts } from 'shared';
import { formatClock } from './format-clock';

/**
 * "Thursday, Aug 6 · 17:00–17:30" in the given zone -- the one date+time-
 * range label the app uses for booking confirmations and list rows alike.
 * When the range crosses a midnight in `zone` (the end instant's zoned date
 * differs from the start's), the end time gets an explicit "(+Nd)" suffix --
 * e.g. "Thursday, Aug 6 · 20:00–00:00 (+1d)" -- so a reader can't mistake
 * the range for ending earlier than it started; without it, an end time
 * that reads as an earlier clock time than the start looks like a data bug
 * rather than a booking that legitimately runs past midnight.
 */
export function formatRangeLabel(startInstant: string, endInstant: string, zone: string): string {
  const start = toZonedParts(startInstant, zone);
  const end = toZonedParts(endInstant, zone);
  const dateLabel = new Date(Date.UTC(start.year, start.month - 1, start.day)).toLocaleDateString(
    'en-US',
    { weekday: 'long', month: 'short', day: 'numeric' },
  );
  const dayOffset = getInstantRangeDayOffset(startInstant, endInstant, zone);
  const endOffsetSuffix = dayOffset !== 0 ? ` (${dayOffset > 0 ? '+' : ''}${dayOffset}d)` : '';
  return `${dateLabel} · ${formatClock(start.hour, start.minute)}–${formatClock(end.hour, end.minute)}${endOffsetSuffix}`;
}
