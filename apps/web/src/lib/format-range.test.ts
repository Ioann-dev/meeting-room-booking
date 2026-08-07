import { formatRangeLabel } from './format-range';

describe('formatRangeLabel', () => {
  it('formats a same-day range with no offset suffix', () => {
    const label = formatRangeLabel(
      '2026-08-06T14:00:00.000Z',
      '2026-08-06T14:30:00.000Z',
      'Europe/Kyiv',
    );
    expect(label).toBe('Thursday, Aug 6 · 17:00–17:30');
  });

  it('flags a viewer-local range that crosses midnight with an explicit day-offset suffix (F3)', () => {
    // Kyiv 11:00-15:00 (a normal 4-hour office-hours booking, entirely
    // within one Kyiv calendar day) viewed in Pacific/Auckland reads as
    // 20:00 Thursday - 00:00 Friday: the end time's clock reading (00:00)
    // is earlier than the start's (20:00) only because the range has
    // rolled onto the next viewer-local calendar day, not because it runs
    // backwards.
    const label = formatRangeLabel(
      '2026-08-06T08:00:00.000Z',
      '2026-08-06T12:00:00.000Z',
      'Pacific/Auckland',
    );
    expect(label).toBe('Thursday, Aug 6 · 20:00–00:00 (+1d)');
  });

  it('omits the suffix when the range ends on the same viewer-local date it started, even close to midnight', () => {
    const label = formatRangeLabel(
      '2026-08-06T08:00:00.000Z',
      '2026-08-06T08:30:00.000Z',
      'Pacific/Auckland',
    );
    // Kyiv 11:00-11:30 -> Auckland 20:00-20:30, same calendar day both ends.
    expect(label).toBe('Thursday, Aug 6 · 20:00–20:30');
  });
});
