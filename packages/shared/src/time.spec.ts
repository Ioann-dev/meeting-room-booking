import { OFFICE_TIMEZONE } from './office';
import {
  generateWeeklyOccurrences,
  getDurationMinutes,
  getOfficeWeekBoundaries,
  intervalsOverlap,
  isAlignedToSlot,
  isUnambiguousIsoInstant,
  isValidDuration,
  isWithinOfficeHours,
  parseIsoInstant,
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

describe('intervalsOverlap', () => {
  it('returns false for adjacent intervals (one ends exactly when the other starts)', () => {
    // [10:00, 11:00) and [11:00, 12:00) -- half-open semantics mean these
    // never conflict; adjacency is a property of the definition, not a
    // special case bolted onto it (see docs/decisions/0001-booking-overlap.md).
    expect(
      intervalsOverlap(
        '2026-06-01T10:00:00.000Z',
        '2026-06-01T11:00:00.000Z',
        '2026-06-01T11:00:00.000Z',
        '2026-06-01T12:00:00.000Z',
      ),
    ).toBe(false);

    // Symmetric: the second interval starting before the first also holds.
    expect(
      intervalsOverlap(
        '2026-06-01T11:00:00.000Z',
        '2026-06-01T12:00:00.000Z',
        '2026-06-01T10:00:00.000Z',
        '2026-06-01T11:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('returns true for a partial overlap', () => {
    // [10:00, 11:00) and [10:30, 11:30) share [10:30, 11:00).
    expect(
      intervalsOverlap(
        '2026-06-01T10:00:00.000Z',
        '2026-06-01T11:00:00.000Z',
        '2026-06-01T10:30:00.000Z',
        '2026-06-01T11:30:00.000Z',
      ),
    ).toBe(true);
  });

  it('returns true for a full overlap (identical intervals)', () => {
    expect(
      intervalsOverlap(
        '2026-06-01T10:00:00.000Z',
        '2026-06-01T11:00:00.000Z',
        '2026-06-01T10:00:00.000Z',
        '2026-06-01T11:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('returns true when one interval is fully contained within the other', () => {
    // [10:00, 12:00) contains [10:30, 11:00).
    expect(
      intervalsOverlap(
        '2026-06-01T10:00:00.000Z',
        '2026-06-01T12:00:00.000Z',
        '2026-06-01T10:30:00.000Z',
        '2026-06-01T11:00:00.000Z',
      ),
    ).toBe(true);

    // Same pair, arguments reversed -- the predicate is symmetric.
    expect(
      intervalsOverlap(
        '2026-06-01T10:30:00.000Z',
        '2026-06-01T11:00:00.000Z',
        '2026-06-01T10:00:00.000Z',
        '2026-06-01T12:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('returns false for intervals on neighboring days with no shared instant', () => {
    // Monday 18:30-19:00 Kyiv and Tuesday 09:00-09:30 Kyiv: same room's
    // schedule could plausibly hold both; they must never be flagged as
    // overlapping just because they're close together across a day boundary.
    expect(
      intervalsOverlap(
        '2026-06-01T15:30:00.000Z', // Mon 18:30 Kyiv
        '2026-06-01T16:00:00.000Z', // Mon 19:00 Kyiv
        '2026-06-02T06:00:00.000Z', // Tue 09:00 Kyiv
        '2026-06-02T06:30:00.000Z', // Tue 09:30 Kyiv
      ),
    ).toBe(false);
  });
});

describe('parseIsoInstant (host-timezone independence)', () => {
  // A native `new Date('2099-06-20T06:00:00')` (no offset) resolves in the
  // host process's local zone -- confirmed to produce three different UTC
  // instants (03:00Z, 04:00Z, 06:00Z) across Europe/Kyiv, Europe/Berlin and
  // UTC host TZs during this fix's investigation. parseIsoInstant must not
  // reproduce that: it goes through the same Luxon `{ zone: 'utc' }` path
  // as every other instant in this module, so the result is fixed by the
  // string alone, never by `process.env.TZ`.
  const HOST_TIMEZONES = [
    'UTC',
    'Europe/Kyiv',
    'Europe/Berlin',
    'Pacific/Kiritimati',
    'America/New_York',
  ];
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('resolves an offset-bearing instant identically regardless of host TZ', () => {
    const results = HOST_TIMEZONES.map((tz) => {
      process.env.TZ = tz;
      return parseIsoInstant('2026-06-01T09:00:00.000+03:00').toISOString();
    });
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe('2026-06-01T06:00:00.000Z');
  });

  it('resolves a Z-suffixed instant identically regardless of host TZ', () => {
    const results = HOST_TIMEZONES.map((tz) => {
      process.env.TZ = tz;
      return parseIsoInstant('2026-06-01T06:00:00.000Z').toISOString();
    });
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe('2026-06-01T06:00:00.000Z');
  });

  it('interprets even a naive (offset-less) string as UTC regardless of host TZ', () => {
    // parseIsoInstant itself is defense-in-depth: it must never depend on
    // TZ even for input the API layer's ISO_INSTANT_PATTERN would reject
    // before this function is ever reached.
    const results = HOST_TIMEZONES.map((tz) => {
      process.env.TZ = tz;
      return parseIsoInstant('2026-06-01T06:00:00.000').toISOString();
    });
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe('2026-06-01T06:00:00.000Z');
  });

  it('throws on an unparseable string rather than silently producing an invalid date', () => {
    expect(() => parseIsoInstant('not-a-date')).toThrow();
  });
});

describe('isUnambiguousIsoInstant / ISO_INSTANT_PATTERN', () => {
  it('accepts an extended-format instant with an explicit Z', () => {
    expect(isUnambiguousIsoInstant('2026-06-01T06:00:00.000Z')).toBe(true);
    expect(isUnambiguousIsoInstant('2026-06-01T06:00:00Z')).toBe(true);
  });

  it('accepts an extended-format instant with an explicit numeric offset', () => {
    expect(isUnambiguousIsoInstant('2026-06-01T09:00:00.000+03:00')).toBe(true);
    expect(isUnambiguousIsoInstant('2026-06-01T09:00:00-05:00')).toBe(true);
  });

  it('rejects an offset-less (ambiguous) date-time', () => {
    // The exact shape an HTML <input type="datetime-local"> produces --
    // silently ambiguous about which zone it's in.
    expect(isUnambiguousIsoInstant('2026-06-01T06:00:00')).toBe(false);
    expect(isUnambiguousIsoInstant('2026-06-01T06:00:00.000')).toBe(false);
  });

  it('rejects ISO-8601 basic format (no separators)', () => {
    expect(isUnambiguousIsoInstant('20260601T060000Z')).toBe(false);
  });

  it('rejects an ISO-8601 week-date', () => {
    expect(isUnambiguousIsoInstant('2026-W23-1')).toBe(false);
  });

  it('rejects a date-only string', () => {
    expect(isUnambiguousIsoInstant('2026-06-01')).toBe(false);
  });

  it('rejects a completely malformed string', () => {
    expect(isUnambiguousIsoInstant('not-a-date')).toBe(false);
    expect(isUnambiguousIsoInstant('')).toBe(false);
  });
});

describe('generateWeeklyOccurrences', () => {
  it('returns exactly occurrenceCount occurrences, with occurrence 0 equal to the input', () => {
    const occurrences = generateWeeklyOccurrences(
      '2026-08-04T06:00:00.000Z', // Tue 09:00 Kyiv
      '2026-08-04T06:30:00.000Z',
      8,
      OFFICE_TIMEZONE,
    );
    expect(occurrences).toHaveLength(8);
    expect(occurrences[0]).toEqual({
      startUtc: '2026-08-04T06:00:00.000Z',
      endUtc: '2026-08-04T06:30:00.000Z',
    });
  });

  it('spaces occurrences exactly 7 days apart with no DST transition in range', () => {
    const occurrences = generateWeeklyOccurrences(
      '2026-08-04T06:00:00.000Z',
      '2026-08-04T06:30:00.000Z',
      4,
      OFFICE_TIMEZONE,
    );
    expect(occurrences.map((o) => o.startUtc)).toEqual([
      '2026-08-04T06:00:00.000Z',
      '2026-08-11T06:00:00.000Z',
      '2026-08-18T06:00:00.000Z',
      '2026-08-25T06:00:00.000Z',
    ]);
  });

  it('keeps office-local wall-clock time and weekday across the spring-forward transition', () => {
    // Anchor two weeks before 2026-03-29 (spring-forward); the 3rd and 4th
    // occurrences fall on/after it.
    const occurrences = generateWeeklyOccurrences(
      '2026-03-10T07:00:00.000Z', // Tue 09:00 Kyiv (EET, UTC+2)
      '2026-03-10T07:30:00.000Z',
      4,
      OFFICE_TIMEZONE,
    );
    expect(occurrences.map((o) => o.startUtc)).toEqual([
      '2026-03-10T07:00:00.000Z', // EET: 09:00 Kyiv
      '2026-03-17T07:00:00.000Z', // EET: 09:00 Kyiv
      '2026-03-24T07:00:00.000Z', // EET: still before the transition
      '2026-03-31T06:00:00.000Z', // EEST: UTC instant shifts, but stays 09:00 Kyiv
    ]);
    for (const occurrence of occurrences) {
      const parts = toZonedParts(occurrence.startUtc, OFFICE_TIMEZONE);
      expect(parts.hour).toBe(9);
      expect(parts.minute).toBe(0);
      expect(parts.weekday).toBe(2); // Tuesday, every time
    }
  });

  it('keeps office-local wall-clock time and weekday across the fall-back transition', () => {
    // Anchor two weeks before 2026-10-25 (fall-back); the 3rd and 4th
    // occurrences fall on/after it.
    const occurrences = generateWeeklyOccurrences(
      '2026-10-13T06:00:00.000Z', // Tue 09:00 Kyiv (EEST, UTC+3)
      '2026-10-13T06:30:00.000Z',
      4,
      OFFICE_TIMEZONE,
    );
    expect(occurrences.map((o) => o.startUtc)).toEqual([
      '2026-10-13T06:00:00.000Z', // EEST: 09:00 Kyiv
      '2026-10-20T06:00:00.000Z', // EEST: 09:00 Kyiv
      '2026-10-27T07:00:00.000Z', // EET: UTC instant shifts, but stays 09:00 Kyiv
      '2026-11-03T07:00:00.000Z', // EET: 09:00 Kyiv
    ]);
    for (const occurrence of occurrences) {
      const parts = toZonedParts(occurrence.startUtc, OFFICE_TIMEZONE);
      expect(parts.hour).toBe(9);
      expect(parts.minute).toBe(0);
      expect(parts.weekday).toBe(2);
    }
  });

  it('preserves duration across a DST transition', () => {
    const occurrences = generateWeeklyOccurrences(
      '2026-10-13T06:00:00.000Z',
      '2026-10-13T07:00:00.000Z', // 1 hour
      4,
      OFFICE_TIMEZONE,
    );
    for (const occurrence of occurrences) {
      expect(getDurationMinutes(occurrence.startUtc, occurrence.endUtc)).toBe(60);
    }
  });

  it('resolves an arbitrary IANA zone, not just the office zone', () => {
    const occurrences = generateWeeklyOccurrences(
      '2026-01-15T14:00:00.000Z', // 09:00 America/New_York (UTC-5)
      '2026-01-15T14:30:00.000Z',
      2,
      'America/New_York',
    );
    expect(occurrences[1]!.startUtc).toBe('2026-01-22T14:00:00.000Z');
  });
});
