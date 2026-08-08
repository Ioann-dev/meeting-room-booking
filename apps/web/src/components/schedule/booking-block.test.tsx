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

function renderBlock(rowSpan: number, overrides: Partial<BookingSummary> = {}) {
  return render(
    <BookingBlock
      booking={{ ...BOOKING, ...overrides }}
      rowSpan={rowSpan}
      startLabel="09:00"
      endLabel="09:30"
      onSelect={() => {}}
      gridColumn={2}
      gridRowStart={2}
    />,
  );
}

describe('BookingBlock deterministic row geometry', () => {
  it('spans exactly `rowSpan` grid tracks via grid-row, not a hand-computed height', () => {
    renderBlock(3);
    const button = screen.getByRole('button');
    // The grid track-sizing algorithm computes the exact pixel height for
    // 3 spanned tracks (including their internal gaps) itself -- this is
    // the single source of truth for a booking's height, not a separately
    // maintained calc() expression.
    expect(button.style.gridRow).toBe('2 / span 3');
  });

  it('places a 60-minute booking across exactly 2 tracks and a 30-minute booking across exactly 1', () => {
    const two = renderBlock(2);
    expect(screen.getByRole('button').style.gridRow).toBe('2 / span 2');
    two.unmount();

    renderBlock(1);
    expect(screen.getByRole('button').style.gridRow).toBe('2 / span 1');
  });

  it('positions the block in the correct day column via grid-column', () => {
    render(
      <BookingBlock
        booking={BOOKING}
        rowSpan={1}
        startLabel="09:00"
        endLabel="09:30"
        onSelect={() => {}}
        gridColumn={5}
        gridRowStart={7}
      />,
    );
    expect(screen.getByRole('button').style.gridColumn).toBe('5');
  });

  it('clips overflowing content instead of letting it grow the cell', () => {
    renderBlock(1);
    expect(screen.getByRole('button').className).toContain('overflow-hidden');
  });

  it('draws its keyboard focus ring inset rather than at the default positive offset', () => {
    // The default global :focus-visible ring (globals.css) uses a positive
    // outline-offset, which draws outside the element's own box -- for a
    // button this tightly sized and overflow-hidden, that positive-offset
    // ring gets silently clipped to nothing. A negative offset keeps the
    // ring within the button's own painted area.
    renderBlock(1);
    expect(screen.getByRole('button').className).toContain('focus-visible:outline-offset-[-2px]');
  });

  it('keeps the full title, author, and time in the accessible name even when the time is not visually shown', () => {
    renderBlock(1);
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
    renderBlock(1, { isOwnBooking: true });
    expect(
      screen.getByRole('button', { name: `${BOOKING.title}, your booking, 09:00–09:30` }),
    ).toBeInTheDocument();
  });
});

describe('BookingBlock ownership color treatment', () => {
  it('gives an own booking the fixed teal ownership background, not a hashed palette color', () => {
    renderBlock(1, { isOwnBooking: true });
    const button = screen.getByRole('button');
    expect(button.style.background).toContain('var(--color-teal-soft)');
    expect(button.style.borderLeftColor).toContain('var(--color-teal)');
  });

  it('gives two different other-user bookings a real background color from the event palette', () => {
    const first = renderBlock(1, { id: 'booking-aaa', isOwnBooking: false });
    const firstBg = screen.getByRole('button').style.background;
    first.unmount();

    renderBlock(1, { id: 'booking-aaa', isOwnBooking: false });
    const secondBg = screen.getByRole('button').style.background;

    // Same id -> same deterministic color across renders, and never the
    // teal ownership color reserved for the viewer's own bookings. jsdom
    // normalizes the hex value assigned via style.background to rgb(...)
    // on read-back, so the format check only rules out an unset/empty
    // value or the CSS-variable-keyword ownership treatment, not the hex
    // literal itself.
    expect(firstBg).toBe(secondBg);
    expect(firstBg).not.toBe('var(--color-teal-soft)');
    expect(firstBg).toMatch(/^rgb\(/);
  });
});

describe('BookingBlock duration-aware content density', () => {
  it('shows title and author on a 30-minute block, both with real visible height, and no time line', () => {
    renderBlock(1);
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
    renderBlock(1, { isOwnBooking: true });
    const button = screen.getByRole('button');
    const texts = Array.from(button.querySelectorAll('span[aria-hidden="true"]'))
      .filter((el) => el.textContent)
      .map((el) => el.textContent);
    expect(texts).toContain('You');
    expect(texts).not.toContain(BOOKING.authorName);
  });

  it('shows title, author, and time on a 60-minute (rowSpan 2) block', () => {
    renderBlock(2);
    const button = screen.getByRole('button');
    const texts = Array.from(button.querySelectorAll('span[aria-hidden="true"]'))
      .filter((el) => el.textContent)
      .map((el) => el.textContent);
    expect(texts).toContain(BOOKING.title);
    expect(texts).toContain(BOOKING.authorName);
    expect(texts.some((t) => t?.includes('09:00') && t.includes('09:30'))).toBe(true);
  });

  it('omits the visible gap between lines only for a 30-minute block, not for longer ones', () => {
    const single = renderBlock(1);
    expect(screen.getByRole('button').className).toContain('gap-0');
    single.unmount();

    renderBlock(2);
    expect(screen.getByRole('button').className).toContain('gap-0.5');
  });
});
