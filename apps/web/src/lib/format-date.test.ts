import {
  formatDayMonth,
  formatFullDateLabel,
  formatSelectDateLabel,
  formatWeekRangeLabel,
} from './format-date';

describe('formatDayMonth', () => {
  it('pads the day and abbreviates the month', () => {
    expect(formatDayMonth(8, 3)).toBe('03 Aug');
  });

  it('handles a double-digit day without extra padding', () => {
    expect(formatDayMonth(1, 25)).toBe('25 Jan');
  });
});

describe('formatWeekRangeLabel', () => {
  it('formats a week entirely within one month', () => {
    expect(
      formatWeekRangeLabel({ year: 2026, month: 8, day: 3 }, { year: 2026, month: 8, day: 9 }),
    ).toBe('03–09 Aug 2026');
  });

  it('formats a week that crosses a month boundary within the same year', () => {
    expect(
      formatWeekRangeLabel({ year: 2026, month: 8, day: 31 }, { year: 2026, month: 9, day: 6 }),
    ).toBe('31 Aug – 06 Sep 2026');
  });

  it('formats a week that crosses a year boundary', () => {
    expect(
      formatWeekRangeLabel({ year: 2026, month: 12, day: 28 }, { year: 2027, month: 1, day: 3 }),
    ).toBe('28 Dec 2026 – 03 Jan 2027');
  });
});

describe('formatFullDateLabel', () => {
  it('formats weekday, day+month, and year in prose form', () => {
    expect(formatFullDateLabel('Saturday', 8, 8, 2026)).toBe('Saturday, 08 Aug 2026');
  });
});

describe('formatSelectDateLabel', () => {
  it('formats weekday and a dotted DD.MM.YYYY date', () => {
    expect(formatSelectDateLabel('Monday', 8, 3, 2026)).toBe('Monday, 03.08.2026');
  });
});
