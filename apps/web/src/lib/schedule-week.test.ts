import { weekParamToReferenceDate, weekStartToWeekParam } from './schedule-week';

describe('weekParamToReferenceDate', () => {
  it('converts an office-local calendar date to its UTC midnight instant', () => {
    // 2026-06-01 is EEST (Kyiv summer, UTC+3): local midnight = 2026-05-31T21:00:00Z
    expect(weekParamToReferenceDate('2026-06-01')).toBe('2026-05-31T21:00:00.000Z');
  });

  it('resolves winter (EET, UTC+2) offset correctly', () => {
    expect(weekParamToReferenceDate('2026-01-05')).toBe('2026-01-04T22:00:00.000Z');
  });

  it('returns undefined for a missing param', () => {
    expect(weekParamToReferenceDate(null)).toBeUndefined();
  });

  it('returns undefined for a malformed param', () => {
    expect(weekParamToReferenceDate('not-a-date')).toBeUndefined();
    expect(weekParamToReferenceDate('2026/06/01')).toBeUndefined();
  });

  it('returns undefined for a calendar date that does not exist', () => {
    expect(weekParamToReferenceDate('2026-02-30')).toBeUndefined();
  });
});

describe('weekStartToWeekParam', () => {
  it('round-trips a week-start instant back to its office-local date', () => {
    expect(weekStartToWeekParam('2026-05-31T21:00:00.000Z')).toBe('2026-06-01');
  });

  it('is the exact inverse of weekParamToReferenceDate for a valid param', () => {
    const param = '2026-08-03';
    const instant = weekParamToReferenceDate(param);
    expect(instant).toBeDefined();
    expect(weekStartToWeekParam(instant!)).toBe(param);
  });
});
