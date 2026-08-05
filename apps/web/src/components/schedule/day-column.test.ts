import type { BookingSummary } from 'shared';
import { buildDayColumn, type DayBooking } from './day-column';

function booking(id: string): BookingSummary {
  return {
    id,
    roomId: 'room-1',
    title: `Booking ${id}`,
    startAt: '2026-06-03T07:00:00.000Z',
    endAt: '2026-06-03T08:00:00.000Z',
    authorName: 'Ada Lovelace',
    isOwnBooking: false,
    seriesId: null,
  };
}

describe('buildDayColumn', () => {
  it('lays out an empty day as all free rows', () => {
    const cells = buildDayColumn([], 4);
    expect(cells).toEqual([
      { kind: 'free', rowIndex: 0 },
      { kind: 'free', rowIndex: 1 },
      { kind: 'free', rowIndex: 2 },
      { kind: 'free', rowIndex: 3 },
    ]);
  });

  it('places a single multi-row booking with covered rows for the rest of its span', () => {
    const dayBookings: DayBooking[] = [{ booking: booking('a'), rowStart: 1, rowSpan: 2 }];
    const cells = buildDayColumn(dayBookings, 4);
    expect(cells).toEqual([
      { kind: 'free', rowIndex: 0 },
      { kind: 'booking', rowIndex: 1, rowSpan: 2, booking: booking('a') },
      { kind: 'covered' },
      { kind: 'free', rowIndex: 3 },
    ]);
  });

  it('renders two back-to-back bookings as adjacent blocks with no gap and no overlap', () => {
    const dayBookings: DayBooking[] = [
      { booking: booking('a'), rowStart: 0, rowSpan: 2 },
      { booking: booking('b'), rowStart: 2, rowSpan: 2 },
    ];
    const cells = buildDayColumn(dayBookings, 4);
    expect(cells).toEqual([
      { kind: 'booking', rowIndex: 0, rowSpan: 2, booking: booking('a') },
      { kind: 'covered' },
      { kind: 'booking', rowIndex: 2, rowSpan: 2, booking: booking('b') },
      { kind: 'covered' },
    ]);
  });

  it('produces exactly one entry per row regardless of input order', () => {
    const dayBookings: DayBooking[] = [
      { booking: booking('b'), rowStart: 3, rowSpan: 1 },
      { booking: booking('a'), rowStart: 0, rowSpan: 1 },
    ];
    const cells = buildDayColumn(dayBookings, 4);
    expect(cells).toHaveLength(4);
    expect(cells[0]).toEqual({ kind: 'booking', rowIndex: 0, rowSpan: 1, booking: booking('a') });
    expect(cells[3]).toEqual({ kind: 'booking', rowIndex: 3, rowSpan: 1, booking: booking('b') });
  });

  it('clamps a booking that would run past the last office-hour row', () => {
    const dayBookings: DayBooking[] = [{ booking: booking('a'), rowStart: 2, rowSpan: 5 }];
    const cells = buildDayColumn(dayBookings, 4);
    expect(cells).toEqual([
      { kind: 'free', rowIndex: 0 },
      { kind: 'free', rowIndex: 1 },
      { kind: 'booking', rowIndex: 2, rowSpan: 2, booking: booking('a') },
      { kind: 'covered' },
    ]);
  });
});
