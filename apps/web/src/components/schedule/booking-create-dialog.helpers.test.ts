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

describe('buildStartOptions viewer-zone labels (F1)', () => {
  it('labels each option in the resolved viewer zone, not the Kyiv office zone', () => {
    // Kyiv 09:00 on 2026-06-02 is Berlin 08:00 (Kyiv EEST +3, Berlin CEST +2).
    const options = buildStartOptions(DAY, null, 'Europe/Berlin');
    const first = options[0]!;
    expect(first.label).toBe('08:00 · Office 09:00');
    // The underlying instant a user actually books is untouched by the
    // display zone -- only the label changes.
    expect(first.instant).toBe(zonedWallTimeToUtc({ ...DAY, hour: 9, minute: 0 }, OFFICE_TIMEZONE));
  });

  it('flags a viewer-local date that differs from the Kyiv business day being browsed', () => {
    // Kyiv 09:00 on 2026-06-02 (UTC+3) is 20:00 the *previous* day in
    // Pacific/Honolulu (UTC-10, no DST).
    const options = buildStartOptions(DAY, null, 'Pacific/Honolulu');
    const first = options[0]!;
    expect(first.label).toBe('20:00 (-1d) · Office 09:00');
  });

  it('omits the office suffix entirely when the viewer zone is Kyiv itself', () => {
    const options = buildStartOptions(DAY, null, OFFICE_TIMEZONE);
    expect(options[0]!.label).toBe('09:00');
  });

  it('still only offers Kyiv office-hour slot boundaries regardless of viewer zone', () => {
    // Same slot count/instants as the Kyiv-labeled case: changing the
    // display zone must never change which instants are selectable.
    const kyivInstants = buildStartOptions(DAY, null, OFFICE_TIMEZONE).map((o) => o.instant);
    const berlinInstants = buildStartOptions(DAY, null, 'Europe/Berlin').map((o) => o.instant);
    expect(berlinInstants).toEqual(kyivInstants);
  });
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
