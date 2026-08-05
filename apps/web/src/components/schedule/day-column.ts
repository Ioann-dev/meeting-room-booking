import type { BookingSummary } from 'shared';

export type DayCell =
  | { kind: 'free'; rowIndex: number }
  | { kind: 'booking'; rowIndex: number; rowSpan: number; booking: BookingSummary }
  | { kind: 'covered' };

export interface DayBooking {
  booking: BookingSummary;
  rowStart: number;
  rowSpan: number;
}

/**
 * Walks a day's bookings in row order and lays out exactly one DayCell per
 * row (0..totalRows-1): a booking's start row, `rowSpan - 1` "covered" rows
 * that a rowSpan'd <td> already accounts for, or a free row. The 1:1
 * row-to-entry mapping this produces is what lets the grid safely index
 * dayColumns[day][rowIndex] without an extra existence check.
 *
 * Two back-to-back bookings (one ending exactly when the next starts) each
 * get their own entry with no gap and no overlap -- adjacency falls out of
 * this row-by-row walk automatically, the same way it does in
 * `intervalsOverlap` (see packages/shared/src/time.ts).
 */
export function buildDayColumn(dayBookings: DayBooking[], totalRows: number): DayCell[] {
  const cells: DayCell[] = [];
  const sorted = [...dayBookings].sort((a, b) => a.rowStart - b.rowStart);
  let row = 0;
  let index = 0;
  while (row < totalRows) {
    const next = sorted[index];
    if (next && next.rowStart === row) {
      const span = Math.min(next.rowSpan, totalRows - row);
      cells.push({ kind: 'booking', rowIndex: row, rowSpan: span, booking: next.booking });
      for (let i = 1; i < span; i++) {
        cells.push({ kind: 'covered' });
      }
      row += span;
      index++;
    } else {
      cells.push({ kind: 'free', rowIndex: row });
      row++;
    }
  }
  return cells;
}
