import { toZonedParts } from 'shared';
import { formatClock } from './format-clock';

/** "Thursday, Aug 6 · 17:00–17:30" in the given zone -- the one date+time-range label the app uses for booking confirmations and list rows alike. */
export function formatRangeLabel(startInstant: string, endInstant: string, zone: string): string {
  const start = toZonedParts(startInstant, zone);
  const end = toZonedParts(endInstant, zone);
  const dateLabel = new Date(Date.UTC(start.year, start.month - 1, start.day)).toLocaleDateString(
    'en-US',
    { weekday: 'long', month: 'short', day: 'numeric' },
  );
  return `${dateLabel} · ${formatClock(start.hour, start.minute)}–${formatClock(end.hour, end.minute)}`;
}
