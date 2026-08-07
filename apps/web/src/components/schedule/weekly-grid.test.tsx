import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

/** The day-columns table is the one carrying table-fixed; the rail table doesn't. */
function getDayTable(): HTMLElement {
  return screen.getAllByRole('table').find((table) => table.className.includes('table-fixed'))!;
}

function getRailTable(): HTMLElement {
  return screen.getAllByRole('table').find((table) => !table.className.includes('table-fixed'))!;
}

describe('WeeklyGrid sticky time rail isolation (NEW-1)', () => {
  it('renders the time rail and the day columns as two separate tables, not one shared table', () => {
    renderGrid(null);
    expect(screen.getAllByRole('table')).toHaveLength(2);
  });

  it('never uses left-axis sticky positioning on a table cell -- that combination is what let scrolled day-column content visually bleed through the rail (a real, reproducible Chromium compositing bug for sticky <th>/<td>, confirmed by comparing against an identical non-table sticky <div> that did not bleed)', () => {
    renderGrid(null);
    const allCells = [
      ...getRailTable().querySelectorAll('th, td'),
      ...getDayTable().querySelectorAll('th, td'),
    ];
    for (const cell of allCells) {
      expect(cell.className).not.toMatch(/(?:^|\s)left-0(?:\s|$)/);
    }
  });

  it("keeps the rail table outside the day table's own horizontal scroll container", () => {
    renderGrid(null);
    const railTable = getRailTable();
    const dayTable = getDayTable();
    // The day table's horizontal scroll wrapper must not be an ancestor of
    // the rail table -- otherwise the rail would scroll away with it.
    const dayScrollAncestor = dayTable.closest('.overflow-x-auto');
    expect(dayScrollAncestor).not.toBeNull();
    expect(dayScrollAncestor!.contains(railTable)).toBe(false);
  });

  it('gives the rail and day tables matching header heights so their rows stay aligned without needing to be the same physical table', () => {
    renderGrid(null);
    const railHeaderWrapper = getRailTable().querySelector('thead th > div')!;
    expect(railHeaderWrapper.className).toContain('min-h-14');
    // The day table always renders a (possibly invisible) "Today" line so
    // its header height is deterministic regardless of which day, if any,
    // is today -- matching the rail header's fixed min-h-14 without a
    // runtime measurement dependency between the two tables.
    const todayLines = getDayTable().querySelectorAll('thead th span:last-child');
    expect(todayLines.length).toBeGreaterThan(0);
    for (const line of todayLines) {
      expect(line.textContent).toBe('Today');
    }
  });
});

describe('WeeklyGrid day-column width stability (H1)', () => {
  it('locks the day table to table-layout: fixed so column width cannot be driven by cell content', () => {
    renderGrid(null);
    expect(getDayTable().className).toContain('table-fixed');
  });

  it('renders a long unbroken booking title without changing the day-column width definition', () => {
    const { unmount } = renderGrid(null);
    const emptyWidthClasses = screen.getAllByRole('columnheader').map((th) => th.className);
    unmount();

    renderGrid(longTitleBooking());
    const longTitleWidthClasses = screen.getAllByRole('columnheader').map((th) => th.className);

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
    // The height constraint lives on the inner div, not the <th> itself --
    // table cells don't reliably honor min-height/max-height as a row-
    // sizing floor when alone in a single-column table (verified live: an
    // identical constraint placed directly on the <th> was silently
    // ignored by the browser's row-sizing algorithm).
    const railCell = screen.getAllByRole('rowheader')[0]!;
    const heightWrapper = railCell.querySelector('div')!;
    expect(heightWrapper.className).toContain('min-h-11');
    expect(heightWrapper.className).toContain('max-h-11');
    expect(heightWrapper.className).toContain('md:min-h-8');
    expect(heightWrapper.className).toContain('md:max-h-8');
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

describe('WeeklyGrid viewer-zone DST correctness (F2)', () => {
  // Week of Monday 2026-03-02 through Sunday 2026-03-08: US clocks spring
  // forward at 2026-03-08 07:00 UTC (2 a.m. America/New_York), which falls
  // exactly at the start of that Sunday's Kyiv-anchored office hours
  // (09:00 Kyiv = 07:00 UTC), while Europe/Kyiv's own DST change is still
  // three weeks away (last Sunday of March). So every Kyiv 09:00-19:00
  // office-hour boundary converts to America/New_York at EST (UTC-5) on
  // Monday-Saturday but at EDT (UTC-4) on Sunday -- the same Kyiv wall-clock
  // row genuinely means a different New York wall-clock time depending on
  // which day column it is in.
  const { startUtc: dstWeekStartUtc, endUtc: dstWeekEndUtc } = getOfficeWeekBoundaries(
    '2026-03-04T10:00:00.000Z',
    OFFICE_TIMEZONE,
  );

  function renderDstWeekGrid(userTimeZone: string) {
    return render(
      <WeeklyGrid
        roomName="Copenhagen"
        schedule={{
          roomId: 'room-1',
          weekStartUtc: dstWeekStartUtc,
          weekEndUtc: dstWeekEndUtc,
          bookings: [],
        }}
        userTimeZone={userTimeZone}
        selectedSlotStart={null}
        onSelectSlot={() => {}}
        onSelectBooking={() => {}}
        now={null}
      />,
    );
  }

  it('suppresses the shared secondary rail label for every row when the viewer zone shifts DST mid-week and Kyiv does not', () => {
    renderDstWeekGrid('America/New_York');
    const railRows = screen.getAllByRole('rowheader');
    expect(railRows.length).toBeGreaterThan(0);
    for (const row of railRows) {
      // Exactly the primary Kyiv label -- never a second, potentially-wrong
      // "one value fits all seven columns" viewer-local label.
      expect(row.querySelectorAll('span')).toHaveLength(1);
    }
  });

  it('still shows the shared secondary rail label for a normal week with no mid-week viewer DST shift', () => {
    // Same DST-transition week, but Europe/Berlin's own DST change (last
    // Sunday of March) hasn't happened yet either -- Kyiv and Berlin stay
    // at a constant relative offset all week, so the shared label is valid.
    renderDstWeekGrid('Europe/Berlin');
    const railRows = screen.getAllByRole('rowheader');
    for (const row of railRows) {
      expect(row.querySelectorAll('span')).toHaveLength(2);
    }
  });
});

describe('WeeklyGrid mobile day chips', () => {
  function getChipGroup(): HTMLElement {
    return screen.getByRole('group', { name: 'Select day' });
  }

  it('renders one chip per day with a weekday abbreviation and day number', () => {
    renderGrid(null);
    const chips = within(getChipGroup()).getAllByRole('button');
    expect(chips).toHaveLength(7);
    expect(chips[0]).toHaveTextContent('Mon');
    expect(chips[0]).toHaveTextContent('1');
    expect(chips[6]).toHaveTextContent('Sun');
    expect(chips[6]).toHaveTextContent('7');
  });

  it('marks exactly one chip active via aria-current, defaulting to Monday when "now" is unresolved', () => {
    renderGrid(null);
    const chips = within(getChipGroup()).getAllByRole('button');
    const current = chips.filter((chip) => chip.getAttribute('aria-current') === 'date');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('1');
  });

  it("marks today's chip active once now resolves to a day inside the displayed week", () => {
    // Wednesday of the rendered week (see weekStartUtc above).
    render(
      <WeeklyGrid
        roomName="Copenhagen"
        schedule={{ roomId: 'room-1', weekStartUtc, weekEndUtc, bookings: [] }}
        userTimeZone="Europe/Berlin"
        selectedSlotStart={null}
        onSelectSlot={() => {}}
        onSelectBooking={() => {}}
        now="2026-06-03T10:00:00.000Z"
      />,
    );
    const chips = within(getChipGroup()).getAllByRole('button');
    const current = chips.filter((chip) => chip.getAttribute('aria-current') === 'date');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Wed');
    expect(current[0]).toHaveTextContent('3');
  });

  it('scrolls the day-columns table when a chip is tapped', async () => {
    renderGrid(null);
    const scrollSpy = jest.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {});
    const user = userEvent.setup();

    const chips = within(getChipGroup()).getAllByRole('button');
    await user.click(chips[4]!); // Friday

    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    scrollSpy.mockRestore();
  });

  it('gives every chip a touch-friendly minimum size', () => {
    renderGrid(null);
    for (const chip of within(getChipGroup()).getAllByRole('button')) {
      expect(chip.className).toContain('min-h-11');
      expect(chip.className).toContain('min-w-11');
    }
  });
});
