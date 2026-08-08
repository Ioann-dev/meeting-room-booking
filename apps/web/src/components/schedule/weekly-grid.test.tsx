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

/** The single labeled region standing in for the old table's caption/role. */
function getGridRegion(): HTMLElement {
  return screen.getByRole('group', { name: /Weekly schedule for Copenhagen/ });
}

/** Rail label cells are found by their own aria-label, not a table role. */
function getRailCells(): HTMLElement[] {
  return screen.getAllByLabelText(/Kyiv time/);
}

describe('WeeklyGrid shared grid geometry', () => {
  it('renders the rail and every day column as one shared grid, not separate tables', () => {
    renderGrid(null);
    // No table markup at all -- rail and day columns are grid children of
    // the same `role="group"` container, sharing one grid-template-columns
    // and one grid-template-rows definition (see the next tests), which is
    // what makes their geometry match by construction instead of by two
    // independently-computed layouts happening to agree.
    expect(screen.queryAllByRole('table')).toHaveLength(0);
    expect(getGridRegion().tagName).toBe('DIV');
  });

  it('derives the rail, every day header, and the current-time indicator from the same --slot-h/--header-h tokens', () => {
    renderGrid(null);
    const region = getGridRegion();
    // Both live directly on the single grid container's inline style --
    // one canonical source, not a value duplicated (and potentially
    // diverging) across the rail and the day-columns.
    expect(region.style.getPropertyValue('--slot-h')).toBe('2.75rem');
    expect(region.style.getPropertyValue('--header-h')).toBe('4rem');
    expect(region.style.gridTemplateRows).toBe('var(--header-h) repeat(20, var(--slot-h))');
  });

  it('places the rail column and all 7 day columns in one grid-template-columns declaration', () => {
    renderGrid(null);
    const region = getGridRegion();
    expect(region.className).toContain(
      'grid-cols-[var(--rail-w)_repeat(7,var(--day-col-width,20rem))]',
    );
    expect(region.className).toContain('sm:grid-cols-[var(--rail-w)_repeat(7,minmax(6.5rem,1fr))]');
  });

  it('sticks the rail to the left edge and every day header to the top edge of the one shared scroll container', () => {
    renderGrid(null);
    for (const cell of getRailCells()) {
      expect(cell.className).toMatch(/(?:^|\s)sticky(?:\s|$)/);
      expect(cell.className).toMatch(/(?:^|\s)left-0(?:\s|$)/);
    }
    const dayHeaders = screen.getAllByText(/AUG|MAR|JUN/i, { selector: 'span.tabular-nums' });
    expect(dayHeaders.length).toBeGreaterThan(0);
  });
});

describe('WeeklyGrid day-column width stability', () => {
  it('renders a long unbroken booking title without changing the shared column-definition source', () => {
    const { unmount } = renderGrid(null);
    const emptyColumns = getGridRegion().className;
    unmount();

    renderGrid(longTitleBooking());
    const longTitleColumns = getGridRegion().className;

    // The grid-template-columns declaration lives once, on the container --
    // a 100+ character unbroken title inside one cell has no path to widen
    // its own column, unlike a content-driven table layout would.
    expect(longTitleColumns).toBe(emptyColumns);
  });
});

describe('WeeklyGrid temporal row geometry', () => {
  it('gives every rail cell an accessible label naming the Kyiv time', () => {
    renderGrid(null, OFFICE_TIMEZONE);
    const cells = getRailCells();
    expect(cells.length).toBeGreaterThan(0);
    expect(cells[0]!.getAttribute('aria-label')).toMatch(/Kyiv time$/);
  });

  it('shows the viewer time as the bold primary label and Kyiv as the smaller secondary label when the zones differ', () => {
    renderGrid(null, 'Europe/Berlin');
    const cell = getRailCells()[0]!;
    const spans = Array.from(cell.querySelectorAll('span'));
    expect(spans).toHaveLength(2);
    expect(spans[0]!.className).toContain('font-bold');
    expect(spans[1]!.className).toContain('font-medium');
    expect(cell.getAttribute('aria-label')).toMatch(/your time, .+ Kyiv time$/);
  });

  it('omits the secondary label entirely when the viewer zone matches the office zone', () => {
    renderGrid(null, OFFICE_TIMEZONE);
    const cell = getRailCells()[0]!;
    expect(cell.querySelectorAll('span')).toHaveLength(1);
  });
});

describe('WeeklyGrid viewer-zone DST correctness', () => {
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
    const railCells = getRailCells();
    expect(railCells.length).toBeGreaterThan(0);
    for (const cell of railCells) {
      // Exactly the primary Kyiv label -- never a second, potentially-wrong
      // "one value fits all seven columns" viewer-local label.
      expect(cell.querySelectorAll('span')).toHaveLength(1);
    }
  });

  it('still shows the shared secondary rail label for a normal week with no mid-week viewer DST shift', () => {
    // Same DST-transition week, but Europe/Berlin's own DST change (last
    // Sunday of March) hasn't happened yet either -- Kyiv and Berlin stay
    // at a constant relative offset all week, so the shared label is valid.
    renderDstWeekGrid('Europe/Berlin');
    const railCells = getRailCells();
    for (const cell of railCells) {
      expect(cell.querySelectorAll('span')).toHaveLength(2);
    }
  });
});

describe('WeeklyGrid Today column', () => {
  it('gives the Today header and the Today body tint the exact same grid column', () => {
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
    const region = getGridRegion();
    const todayHeader = within(region).getByText('Wed', { selector: 'span' }).closest('div')!;
    const tint = region.querySelector('[aria-hidden="true"].bg-today-bg') as HTMLElement;
    expect(tint).not.toBeNull();
    // Same literal grid-column index -- not two independently computed
    // widths that happen to match, the header and the tint are placed by
    // the same coordinate.
    expect(tint.style.gridColumn).toBe(todayHeader.style.gridColumn);
    // Spans from the first body row to the last -- a continuous column,
    // not a partial strip.
    expect(tint.style.gridRow).toBe('2 / 22');
  });

  it('renders no Today tint when the visible week does not contain today', () => {
    renderGrid(null, 'Europe/Berlin');
    expect(getGridRegion().querySelector('[aria-hidden="true"].bg-today-bg')).toBeNull();
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

  it('scrolls the shared grid container when a chip is tapped', async () => {
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
