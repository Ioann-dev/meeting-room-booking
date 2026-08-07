import { render, screen } from '@testing-library/react';
import type { BookingSummary } from 'shared';
import { BookingBlock } from './booking-block';

const BOOKING: BookingSummary = {
  id: 'booking-1',
  roomId: 'room-1',
  title: 'Quarterly cross-functional strategic planning workshop',
  startAt: '2026-06-03T09:00:00.000Z',
  endAt: '2026-06-03T09:30:00.000Z',
  authorName: 'Ada Lovelace',
  isOwnBooking: false,
  seriesId: null,
};

function renderInTable(rowSpan: number) {
  return render(
    <table>
      <tbody>
        <tr>
          <BookingBlock
            booking={BOOKING}
            rowSpan={rowSpan}
            startLabel="09:00"
            endLabel="09:30"
            onSelect={() => {}}
          />
        </tr>
      </tbody>
    </table>,
  );
}

describe('BookingBlock deterministic row geometry', () => {
  it('pins the CSS --row-span custom property to the booking duration in rows, not its content', () => {
    renderInTable(3);
    const button = screen.getByRole('button');
    expect(button.style.getPropertyValue('--row-span')).toBe('3');
  });

  it('caps height with both a min and max bound to the same calc() expression, at both breakpoints', () => {
    renderInTable(1);
    const button = screen.getByRole('button');
    expect(button.className).toContain(
      'min-h-[calc(2.75rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
    );
    expect(button.className).toContain(
      'max-h-[calc(2.75rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
    );
    expect(button.className).toContain(
      'md:min-h-[calc(2rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
    );
    expect(button.className).toContain(
      'md:max-h-[calc(2rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
    );
  });

  it('accounts for (rowSpan-1) collapsed row borders (NEW-2) -- rowSpan x unit alone undercounts the true row pitch, producing a duration-dependent gap that grows with booking length', () => {
    // A single-row booking has no "between-row" border to add: the
    // correction term (rowSpan-1)*1px evaluates to 0.
    const single = renderInTable(1);
    expect(screen.getByRole('button').className).toContain(
      'min-h-[calc(2.75rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
    );
    single.unmount();

    // A multi-row booking must add exactly (rowSpan-1)*1px, not a flat
    // per-row constant unrelated to rowSpan -- that distinction is what
    // keeps the correction proportional instead of reintroducing a
    // different constant-offset bug.
    renderInTable(4);
    const button = screen.getByRole('button');
    expect(button.className).toContain(
      'min-h-[calc(2.75rem*var(--row-span)_+_(var(--row-span)_-_1)*1px)]',
    );
    expect(button.style.getPropertyValue('--row-span')).toBe('4');
  });

  it('clips overflowing content instead of letting it grow the cell', () => {
    renderInTable(1);
    const button = screen.getByRole('button');
    const cell = button.closest('td')!;
    expect(button.className).toContain('overflow-hidden');
    expect(cell.className).toContain('overflow-hidden');
  });

  it('draws its keyboard focus ring inset rather than at the default positive offset (H2)', () => {
    // The default global :focus-visible ring (globals.css) uses a positive
    // outline-offset, which draws outside the element's own box -- for a
    // button this tightly sized inside an equally overflow-hidden <td>
    // (the previous test), that positive-offset ring gets silently clipped
    // to nothing. A negative offset keeps the ring within the button's own
    // painted area, where overflow-hidden can never reach it.
    renderInTable(1);
    expect(screen.getByRole('button').className).toContain('focus-visible:outline-offset-[-2px]');
  });

  it('keeps the full title, author, and time in the accessible name even when the time is not visually shown', () => {
    renderInTable(1);
    // An accessible name from an explicit aria-label, not visible subtree
    // text -- this is what getByRole's accessible-name matching resolves
    // against, and it must hold regardless of what's visually rendered at
    // any given rowSpan.
    const button = screen.getByRole('button', {
      name: `${BOOKING.title}, ${BOOKING.authorName}, 09:00–09:30`,
    });
    expect(button).toBeInTheDocument();
  });

  it('names an own booking "your booking" in the accessible name rather than repeating the author', () => {
    render(
      <table>
        <tbody>
          <tr>
            <BookingBlock
              booking={{ ...BOOKING, isOwnBooking: true }}
              rowSpan={1}
              startLabel="09:00"
              endLabel="09:30"
              onSelect={() => {}}
            />
          </tr>
        </tbody>
      </table>,
    );
    expect(
      screen.getByRole('button', { name: `${BOOKING.title}, your booking, 09:00–09:30` }),
    ).toBeInTheDocument();
  });
});

describe('BookingBlock duration-aware content density (H1)', () => {
  it('shows title and author on a 30-minute block, both with real visible height, and no time line', () => {
    renderInTable(1);
    const button = screen.getByRole('button');

    // aria-hidden visible-text spans, queried directly rather than via
    // role: this is asserting what a sighted user sees, which the
    // accessible-name test above deliberately does not cover.
    const lines = Array.from(button.querySelectorAll('span[aria-hidden="true"]')).filter(
      (el) => el.textContent,
    );
    const texts = lines.map((el) => el.textContent);
    expect(texts).toContain(BOOKING.title);
    expect(texts).toContain(BOOKING.authorName);
    expect(texts.some((t) => t?.includes('09:00'))).toBe(false);
  });

  it('shows "You" instead of the author name on a 30-minute own booking', () => {
    render(
      <table>
        <tbody>
          <tr>
            <BookingBlock
              booking={{ ...BOOKING, isOwnBooking: true }}
              rowSpan={1}
              startLabel="09:00"
              endLabel="09:30"
              onSelect={() => {}}
            />
          </tr>
        </tbody>
      </table>,
    );
    const button = screen.getByRole('button');
    const texts = Array.from(button.querySelectorAll('span[aria-hidden="true"]'))
      .filter((el) => el.textContent)
      .map((el) => el.textContent);
    expect(texts).toContain('You');
    expect(texts).not.toContain(BOOKING.authorName);
  });

  it('shows title, author, and time on a 60-minute (rowSpan 2) block', () => {
    renderInTable(2);
    const button = screen.getByRole('button');
    const texts = Array.from(button.querySelectorAll('span[aria-hidden="true"]'))
      .filter((el) => el.textContent)
      .map((el) => el.textContent);
    expect(texts).toContain(BOOKING.title);
    expect(texts).toContain(BOOKING.authorName);
    expect(texts.some((t) => t?.includes('09:00') && t.includes('09:30'))).toBe(true);
  });

  it('omits the visible gap between lines only for a 30-minute block, not for longer ones', () => {
    const single = renderInTable(1);
    expect(screen.getByRole('button').className).toContain('gap-0');
    single.unmount();

    renderInTable(2);
    expect(screen.getByRole('button').className).toContain('gap-0.5');
  });
});
