import { zonedWallTimeToUtc, OFFICE_TIMEZONE, type OfficeWeekDay } from 'shared';
import { buildEndOptions, buildStartOptions } from './booking-create-dialog.helpers';

// A Tuesday well outside any Kyiv DST transition window, so office-hour
// wall-clock arithmetic here is never confounded by an offset change.
const DAY: OfficeWeekDay = { year: 2026, month: 6, day: 2, weekday: 2 };

describe('buildStartOptions', () => {
  it('lists every 30-minute slot from office open up to (not including) close, when nothing is past', () => {
    const options = buildStartOptions(DAY, null);
    expect(options).toHaveLength(20);
    expect(options[0]!.label).toBe('09:00');
    expect(options[options.length - 1]!.label).toBe('18:30');
    expect(options.some((option) => option.label === '19:00')).toBe(false);
  });

  it('excludes slots at or before "now"', () => {
    const noonInstant = options(DAY).find((o) => o.label === '12:00')!.instant;
    const filtered = buildStartOptions(DAY, noonInstant);
    expect(filtered.some((option) => option.label === '12:00')).toBe(false);
    expect(filtered.some((option) => option.label === '11:30')).toBe(false);
    expect(filtered.some((option) => option.label === '12:30')).toBe(true);
  });

  function options(day: OfficeWeekDay) {
    return buildStartOptions(day, null);
  }
});

describe('buildEndOptions', () => {
  it('offers every later boundary up to the 4-hour maximum duration', () => {
    const start = buildStartOptions(DAY, null).find((o) => o.label === '09:00')!.instant;
    const options = buildEndOptions(DAY, start);
    expect(options[0]!.label).toBe('09:30');
    expect(options[options.length - 1]!.label).toBe('13:00');
    expect(options.some((option) => option.label === '13:30')).toBe(false);
  });

  it('caps at office close when close arrives before the 4-hour maximum', () => {
    const start = buildStartOptions(DAY, null).find((o) => o.label === '17:00')!.instant;
    const options = buildEndOptions(DAY, start);
    expect(options[options.length - 1]!.label).toBe('19:00');
    expect(options.every((option) => option.instant > start)).toBe(true);
  });

  it('offers no end times for a start at office close', () => {
    const closeInstant = zonedWallTimeToUtc(
      { year: DAY.year, month: DAY.month, day: DAY.day, hour: 19, minute: 0 },
      OFFICE_TIMEZONE,
    );
    expect(buildEndOptions(DAY, closeInstant)).toHaveLength(0);
  });
});
