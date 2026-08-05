import { render, screen } from '@testing-library/react';
import { getOfficeWeekBoundaries, OFFICE_TIMEZONE, type BookingSummary } from 'shared';
import { WeeklyGrid } from './weekly-grid';

const { startUtc: weekStartUtc, endUtc: weekEndUtc } = getOfficeWeekBoundaries(
  '2026-06-03T10:00:00.000Z',
  OFFICE_TIMEZONE,
);

const LONG_TITLE =
  'Extended annual strategic offsite planning and cross-departmental budget alignment review workshop for all regional leads';

function longTitleBooking(): BookingSummary {
  return {
    id: 'booking-1',
    roomId: 'room-1',
    title: LONG_TITLE,
    // Wednesday 10:00-10:30 Kyiv-local (EEST, UTC+3) = 07:00-07:30Z.
    startAt: '2026-06-03T07:00:00.000Z',
    endAt: '2026-06-03T07:30:00.000Z',
    authorName: 'Ada Lovelace',
    isOwnBooking: false,
    seriesId: null,
  };
}

function renderGrid(booking: BookingSummary | null, userTimeZone: string | null = 'Europe/Berlin') {
  return render(
    <WeeklyGrid
      roomName="Copenhagen"
      schedule={{
        roomId: 'room-1',
        weekStartUtc,
        weekEndUtc,
        bookings: booking ? [booking] : [],
      }}
      userTimeZone={userTimeZone}
      selectedSlotStart={null}
      onSelectSlot={() => {}}
      onSelectBooking={() => {}}
      now={null}
    />,
  );
}

describe('WeeklyGrid day-column width stability (H1)', () => {
  it('locks the table to table-layout: fixed so column width cannot be driven by cell content', () => {
    renderGrid(null);
    const table = screen.getByRole('table');
    expect(table.className).toContain('table-fixed');
  });

  it('renders a long unbroken booking title without changing the day-column width definition', () => {
    const { unmount } = renderGrid(null);
    const emptyWidthClasses = screen
      .getAllByRole('columnheader')
      .slice(1) // skip the Kyiv rail header
      .map((th) => th.className);
    unmount();

    renderGrid(longTitleBooking());
    const longTitleWidthClasses = screen
      .getAllByRole('columnheader')
      .slice(1)
      .map((th) => th.className);

    // Column-defining markup must be identical whether or not a booking with
    // an unbroken 100+ character title is present -- table-fixed decouples
    // column width from cell content entirely, so this holds structurally
    // rather than by coincidence.
    expect(longTitleWidthClasses).toEqual(emptyWidthClasses);
  });
});

describe('WeeklyGrid temporal row geometry (M1)', () => {
  it('pins the time-rail row cell to the same nominal per-row unit as SlotCell/BookingBlock', () => {
    renderGrid(null);
    const railCell = screen.getAllByRole('rowheader')[0]!;
    expect(railCell.className).toContain('min-h-11');
    expect(railCell.className).toContain('max-h-11');
    expect(railCell.className).toContain('md:min-h-8');
    expect(railCell.className).toContain('md:max-h-8');
  });

  it('renders the dual-zone secondary label with tightened line-height so it fits the pinned row budget', () => {
    renderGrid(null, 'Europe/Berlin');
    const railCell = screen.getAllByRole('rowheader')[0]!;
    const [primaryLabel, secondaryLabel] = Array.from(railCell.querySelectorAll('span'));
    expect(primaryLabel!.className).toContain('leading-none');
    // Europe/Berlin differs from OFFICE_TIMEZONE (Europe/Kyiv), so the
    // secondary browser-zone label must be present alongside the primary one.
    expect(secondaryLabel).not.toBeUndefined();
    expect(secondaryLabel!.className).toContain('leading-none');
  });

  it('omits the secondary label entirely when the viewer zone matches the office zone', () => {
    renderGrid(null, OFFICE_TIMEZONE);
    const railCell = screen.getAllByRole('rowheader')[0]!;
    expect(railCell.querySelectorAll('span')).toHaveLength(1);
  });
});
