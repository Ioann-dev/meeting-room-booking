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

  it('keeps the full title, author, and time in the accessible name even though it may be visually clipped', () => {
    renderInTable(1);
    const button = screen.getByRole('button');
    expect(button.textContent).toContain(BOOKING.title);
    expect(button.textContent).toContain(BOOKING.authorName);
    expect(button.textContent).toContain('09:00');
  });
});
