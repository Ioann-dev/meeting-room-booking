import { OFFICE_TIMEZONE } from './office';
import { getOfficeWeekBoundaries } from './time';
import {
  getAdjacentOfficeWeek,
  getBookingPosition,
  getCurrentTimePosition,
  getOfficeSlots,
  getOfficeWeekDays,
  getTodayDayIndex,
} from './schedule';

// Same fixed 2026 Kyiv DST transitions documented in time.spec.ts:
//   - 2026-03-29 01:00 UTC: EET (UTC+2) jumps to EEST (UTC+3)
//   - 2026-10-25 01:00 UTC: EEST falls back to EET

describe('getOfficeWeekDays', () => {
  it('lists the 7 office-local calendar dates for an ordinary week', () => {
    const { startUtc } = getOfficeWeekBoundaries('2026-06-03T10:00:00.000Z', OFFICE_TIMEZONE);
    expect(getOfficeWeekDays(startUtc, OFFICE_TIMEZONE)).toEqual([
      { year: 2026, month: 6, day: 1, weekday: 1 },
      { year: 2026, month: 6, day: 2, weekday: 2 },
      { year: 2026, month: 6, day: 3, weekday: 3 },
      { year: 2026, month: 6, day: 4, weekday: 4 },
      { year: 2026, month: 6, day: 5, weekday: 5 },
      { year: 2026, month: 6, day: 6, weekday: 6 },
      { year: 2026, month: 6, day: 7, weekday: 7 },
    ]);
  });

  it('crosses a month boundary without dropping or duplicating a day', () => {
    const { startUtc } = getOfficeWeekBoundaries('2026-04-01T10:00:00.000Z', OFFICE_TIMEZONE);
    const days = getOfficeWeekDays(startUtc, OFFICE_TIMEZONE);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ year: 2026, month: 3, day: 30, weekday: 1 });
    expect(days[6]).toEqual({ year: 2026, month: 4, day: 5, weekday: 7 });
  });

  it('spans the Kyiv DST spring-forward week without dropping or duplicating a day', () => {
    const { startUtc } = getOfficeWeekBoundaries('2026-03-29T10:00:00.000Z', OFFICE_TIMEZONE);
    const days = getOfficeWeekDays(startUtc, OFFICE_TIMEZONE);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ year: 2026, month: 3, day: 23, weekday: 1 });
    expect(days[6]).toEqual({ year: 2026, month: 3, day: 29, weekday: 7 });
  });
});

describe('getOfficeSlots', () => {
  it('generates 20 half-hour rows for the default 09:00-19:00 office day', () => {
    const slots = getOfficeSlots();
    expect(slots).toHaveLength(20);
    expect(slots[0]).toEqual({ rowIndex: 0, hour: 9, minute: 0 });
    expect(slots[1]).toEqual({ rowIndex: 1, hour: 9, minute: 30 });
    expect(slots[19]).toEqual({ rowIndex: 19, hour: 18, minute: 30 });
  });

  it('respects custom office-hour bounds', () => {
    expect(getOfficeSlots(8, 9, 30)).toEqual([
      { rowIndex: 0, hour: 8, minute: 0 },
      { rowIndex: 1, hour: 8, minute: 30 },
    ]);
  });
});

describe('getBookingPosition', () => {
  const weekStartUtc = getOfficeWeekBoundaries('2026-06-03T10:00:00.000Z', OFFICE_TIMEZONE).startUtc;

  it('places a booking on the correct day, row, and span', () => {
    // Wednesday 2026-06-03, 10:00-11:00 Kyiv-local (EEST, UTC+3) = 07:00-08:00Z
    expect(
      getBookingPosition(
        '2026-06-03T07:00:00.000Z',
        '2026-06-03T08:00:00.000Z',
        weekStartUtc,
        OFFICE_TIMEZONE,
      ),
    ).toEqual({ dayIndex: 2, rowStart: 2, rowSpan: 2 });
  });

  it('renders two back-to-back bookings as adjacent, non-overlapping blocks', () => {
    const first = getBookingPosition(
      '2026-06-03T07:00:00.000Z',
      '2026-06-03T08:00:00.000Z',
      weekStartUtc,
      OFFICE_TIMEZONE,
    )!;
    const second = getBookingPosition(
      '2026-06-03T08:00:00.000Z',
      '2026-06-03T09:00:00.000Z',
      weekStartUtc,
      OFFICE_TIMEZONE,
    )!;
    expect(second.dayIndex).toBe(first.dayIndex);
    expect(second.rowStart).toBe(first.rowStart + first.rowSpan);
  });

  it('returns null for a booking outside the visible week', () => {
    expect(
      getBookingPosition(
        '2026-06-15T07:00:00.000Z',
        '2026-06-15T08:00:00.000Z',
        weekStartUtc,
        OFFICE_TIMEZONE,
      ),
    ).toBeNull();
  });

  it('places a booking correctly across the Kyiv DST spring-forward week', () => {
    const dstWeekStart = getOfficeWeekBoundaries('2026-03-29T10:00:00.000Z', OFFICE_TIMEZONE).startUtc;
    // Sunday 2026-03-29 (the transition day), 10:00-10:30 Kyiv-local, already
    // EEST (UTC+3) since the jump happens at 01:00 UTC = 04:00 local.
    expect(
      getBookingPosition(
        '2026-03-29T07:00:00.000Z',
        '2026-03-29T07:30:00.000Z',
        dstWeekStart,
        OFFICE_TIMEZONE,
      ),
    ).toEqual({ dayIndex: 6, rowStart: 2, rowSpan: 1 });
  });
});

describe('getTodayDayIndex / getCurrentTimePosition', () => {
  const weekStartUtc = getOfficeWeekBoundaries('2026-06-03T10:00:00.000Z', OFFICE_TIMEZONE).startUtc;

  it('identifies which column is today', () => {
    // Thursday 2026-06-04
    expect(getTodayDayIndex('2026-06-04T05:00:00.000Z', weekStartUtc, OFFICE_TIMEZONE)).toBe(3);
  });

  it('returns null when "now" falls outside the visible week', () => {
    expect(getTodayDayIndex('2026-07-01T05:00:00.000Z', weekStartUtc, OFFICE_TIMEZONE)).toBeNull();
  });

  it('computes a fractional current-time row offset within office hours', () => {
    // Thursday 2026-06-04, 10:15 Kyiv-local (EEST, UTC+3) = 07:15Z
    expect(getCurrentTimePosition('2026-06-04T07:15:00.000Z', weekStartUtc, OFFICE_TIMEZONE)).toEqual(
      { dayIndex: 3, rowOffset: 2.5 },
    );
  });

  it('returns null outside office hours even on a visible day', () => {
    // Thursday 2026-06-04, 07:00 Kyiv-local (before the 09:00 open) = 04:00Z
    expect(
      getCurrentTimePosition('2026-06-04T04:00:00.000Z', weekStartUtc, OFFICE_TIMEZONE),
    ).toBeNull();
  });
});

describe('getAdjacentOfficeWeek', () => {
  it('moves forward exactly one office-local week', () => {
    const current = getOfficeWeekBoundaries('2026-06-03T10:00:00.000Z', OFFICE_TIMEZONE);
    const next = getAdjacentOfficeWeek(current.startUtc, 'next', OFFICE_TIMEZONE);
    expect(next).toEqual(getOfficeWeekBoundaries('2026-06-10T10:00:00.000Z', OFFICE_TIMEZONE));
  });

  it('moves back exactly one office-local week', () => {
    const current = getOfficeWeekBoundaries('2026-06-03T10:00:00.000Z', OFFICE_TIMEZONE);
    const previous = getAdjacentOfficeWeek(current.startUtc, 'previous', OFFICE_TIMEZONE);
    expect(previous).toEqual(getOfficeWeekBoundaries('2026-05-27T10:00:00.000Z', OFFICE_TIMEZONE));
  });

  it('crosses the Kyiv DST spring-forward transition correctly', () => {
    const beforeDst = getOfficeWeekBoundaries('2026-03-22T10:00:00.000Z', OFFICE_TIMEZONE);
    const next = getAdjacentOfficeWeek(beforeDst.startUtc, 'next', OFFICE_TIMEZONE);
    expect(next).toEqual(getOfficeWeekBoundaries('2026-03-29T10:00:00.000Z', OFFICE_TIMEZONE));
  });
});
