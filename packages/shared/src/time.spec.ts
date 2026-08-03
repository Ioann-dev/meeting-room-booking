import { OFFICE_TIMEZONE } from './office';
import {
  getDurationMinutes,
  getOfficeWeekBoundaries,
  isAlignedToSlot,
  isValidDuration,
  isWithinOfficeHours,
  toZonedParts,
  zonedWallTimeToUtc,
} from './time';

// Kyiv (Europe/Kyiv) follows the EU DST schedule: EET (UTC+2) in winter,
// EEST (UTC+3) in summer. For 2026 the transitions are:
//   - 2026-03-29 01:00 UTC: 02:59:59 EET jumps straight to 04:00:00 EEST
//   - 2026-10-25 01:00 UTC: 03:59:59 EEST falls back to 03:00:00 EET
// These fixed dates (not "today" or a relative offset) are what make the
// tests below deterministic regardless of when they run.

describe('zonedWallTimeToUtc', () => {
  it('resolves the EET (winter, UTC+2) offset', () => {
    expect(
      zonedWallTimeToUtc({ year: 2026, month: 3, day: 1, hour: 9, minute: 0 }, OFFICE_TIMEZONE),
    ).toBe('2026-03-01T07:00:00.000Z');
  });

  it('resolves the EEST (summer, UTC+3) offset', () => {
    expect(
      zonedWallTimeToUtc({ year: 2026, month: 6, day: 1, hour: 9, minute: 0 }, OFFICE_TIMEZONE),
    ).toBe('2026-06-01T06:00:00.000Z');
  });

  it('resolves 09:00 on the spring-forward day as already EEST', () => {
    expect(
      zonedWallTimeToUtc({ year: 2026, month: 3, day: 29, hour: 9, minute: 0 }, OFFICE_TIMEZONE),
    ).toBe('2026-03-29T06:00:00.000Z');
  });

  it('resolves 09:00 on the fall-back day as already EET', () => {
    expect(
      zonedWallTimeToUtc({ year: 2026, month: 10, day: 25, hour: 9, minute: 0 }, OFFICE_TIMEZONE),
    ).toBe('2026-10-25T07:00:00.000Z');
  });

  it('resolves an arbitrary IANA zone, not just the office zone', () => {
    expect(
      zonedWallTimeToUtc({ year: 2026, month: 1, day: 15, hour: 9, minute: 0 }, 'America/New_York'),
    ).toBe('2026-01-15T14:00:00.000Z');
  });
});

describe('toZonedParts (cross-timezone display)', () => {
  const fixedInstant = '2026-06-01T06:00:00.000Z';

  it('renders the office zone', () => {
    expect(toZonedParts(fixedInstant, OFFICE_TIMEZONE)).toEqual({
      year: 2026,
      month: 6,
      day: 1,
      hour: 9,
      minute: 0,
      weekday: 1,
      offsetMinutes: 180,
      zone: OFFICE_TIMEZONE,
    });
  });

  it('renders a different display zone for the same instant', () => {
    expect(toZonedParts(fixedInstant, 'America/New_York')).toEqual({
      year: 2026,
      month: 6,
      day: 1,
      hour: 2,
      minute: 0,
      weekday: 1,
      offsetMinutes: -240,
      zone: 'America/New_York',
    });
  });

  it('does not depend on the host process local zone', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'Pacific/Kiritimati'; // UTC+14, as far as possible from both Kyiv and UTC
    try {
      expect(toZonedParts(fixedInstant, OFFICE_TIMEZONE)).toEqual({
        year: 2026,
        month: 6,
        day: 1,
        hour: 9,
        minute: 0,
        weekday: 1,
        offsetMinutes: 180,
        zone: OFFICE_TIMEZONE,
      });
    } finally {
      process.env.TZ = originalTz;
    }
  });
});

describe('getOfficeWeekBoundaries', () => {
  it('spans exactly 168 hours for a week with no DST transition', () => {
    const { startUtc, endUtc } = getOfficeWeekBoundaries(
      '2026-08-05T10:00:00.000Z',
      OFFICE_TIMEZONE,
    );
    expect(startUtc).toBe('2026-08-02T21:00:00.000Z'); // Monday 00:00 EEST
    expect(endUtc).toBe('2026-08-09T21:00:00.000Z');
    expect(getDurationMinutes(startUtc, endUtc)).toBe(168 * 60);
  });

  it('spans 167 hours for the week containing the spring-forward transition', () => {
    const { startUtc, endUtc } = getOfficeWeekBoundaries(
      '2026-03-29T10:00:00.000Z',
      OFFICE_TIMEZONE,
    );
    expect(startUtc).toBe('2026-03-22T22:00:00.000Z'); // Monday 00:00 EET
    expect(endUtc).toBe('2026-03-29T21:00:00.000Z'); // next Monday 00:00 EEST
    expect(getDurationMinutes(startUtc, endUtc)).toBe(167 * 60);
  });

  it('spans 169 hours for the week containing the fall-back transition', () => {
    const { startUtc, endUtc } = getOfficeWeekBoundaries(
      '2026-10-25T10:00:00.000Z',
      OFFICE_TIMEZONE,
    );
    expect(startUtc).toBe('2026-10-18T21:00:00.000Z'); // Monday 00:00 EEST
    expect(endUtc).toBe('2026-10-25T22:00:00.000Z'); // next Monday 00:00 EET
    expect(getDurationMinutes(startUtc, endUtc)).toBe(169 * 60);
  });
});

describe('isAlignedToSlot', () => {
  it('accepts :00 and :30 in the office zone', () => {
    expect(isAlignedToSlot('2026-06-01T06:00:00.000Z', OFFICE_TIMEZONE)).toBe(true); // 09:00 Kyiv
    expect(isAlignedToSlot('2026-06-01T06:30:00.000Z', OFFICE_TIMEZONE)).toBe(true); // 09:30 Kyiv
  });

  it('rejects an off-grid minute', () => {
    expect(isAlignedToSlot('2026-06-01T06:15:00.000Z', OFFICE_TIMEZONE)).toBe(false); // 09:15 Kyiv
  });

  it('rejects a non-zero second component', () => {
    expect(isAlignedToSlot('2026-06-01T06:00:01.000Z', OFFICE_TIMEZONE)).toBe(false);
  });

  it('checks alignment in the target zone, not the raw UTC minute', () => {
    // 06:00 UTC is hour-aligned in UTC itself, but Asia/Kolkata's +5:30
    // offset shifts the local wall clock to 11:30 -- not hour-aligned.
    expect(isAlignedToSlot('2026-06-01T06:00:00.000Z', 'Asia/Kolkata', 60)).toBe(false);
    expect(isAlignedToSlot('2026-06-01T06:00:00.000Z', 'Europe/Kyiv', 60)).toBe(true);
  });
});

describe('isValidDuration', () => {
  it('accepts the minimum (30 min) and maximum (4 h) durations', () => {
    expect(isValidDuration('2026-06-01T09:00:00.000Z', '2026-06-01T09:30:00.000Z')).toBe(true);
    expect(isValidDuration('2026-06-01T09:00:00.000Z', '2026-06-01T13:00:00.000Z')).toBe(true);
  });

  it('rejects a duration below the minimum', () => {
    expect(isValidDuration('2026-06-01T09:00:00.000Z', '2026-06-01T09:15:00.000Z')).toBe(false);
  });

  it('rejects a duration above the maximum', () => {
    expect(isValidDuration('2026-06-01T09:00:00.000Z', '2026-06-01T13:01:00.000Z')).toBe(false);
  });

  it('rejects a zero or negative duration', () => {
    expect(isValidDuration('2026-06-01T09:00:00.000Z', '2026-06-01T09:00:00.000Z')).toBe(false);
    expect(isValidDuration('2026-06-01T09:30:00.000Z', '2026-06-01T09:00:00.000Z')).toBe(false);
  });
});

describe('isWithinOfficeHours', () => {
  it('accepts a booking exactly at the opening and closing boundary', () => {
    expect(
      isWithinOfficeHours('2026-06-01T06:00:00.000Z', '2026-06-01T16:00:00.000Z', OFFICE_TIMEZONE),
    ).toBe(
      true, // 09:00-19:00 Kyiv
    );
  });

  it('rejects a booking starting before opening', () => {
    expect(
      isWithinOfficeHours('2026-06-01T05:30:00.000Z', '2026-06-01T06:30:00.000Z', OFFICE_TIMEZONE),
    ).toBe(
      false, // 08:30-09:30 Kyiv
    );
  });

  it('rejects a booking ending after closing', () => {
    expect(
      isWithinOfficeHours('2026-06-01T15:30:00.000Z', '2026-06-01T16:30:00.000Z', OFFICE_TIMEZONE),
    ).toBe(
      false, // 18:30-19:30 Kyiv
    );
  });

  it('rejects a booking that crosses midnight office-local', () => {
    expect(
      isWithinOfficeHours('2026-06-01T20:00:00.000Z', '2026-06-01T22:00:00.000Z', OFFICE_TIMEZONE),
    ).toBe(
      false, // 23:00 Kyiv -> 01:00 next day Kyiv
    );
  });

  it('remains correct for a booking on the spring-forward transition day', () => {
    // 09:00-10:00 Kyiv on 2026-03-29, entirely after that day's 01:00 UTC
    // clock jump, so it is unambiguous EEST local time.
    expect(
      isWithinOfficeHours('2026-03-29T06:00:00.000Z', '2026-03-29T07:00:00.000Z', OFFICE_TIMEZONE),
    ).toBe(true);
  });
});
