import { render, screen } from '@testing-library/react';
import type { MyBookingSummary } from 'shared';
import { BookingRow } from './booking-row';

const BOOKING: MyBookingSummary = {
  id: 'booking-1',
  roomId: 'room-42',
  roomName: 'Athens',
  title: 'Sprint planning',
  // A Wednesday -- its office-local week starts the preceding Monday, 2026-06-01.
  startAt: '2026-06-03T09:00:00.000Z',
  endAt: '2026-06-03T10:00:00.000Z',
  status: 'ACTIVE',
  seriesId: null,
};

describe('BookingRow', () => {
  it("deep-links to the booking's room and office-local week", () => {
    render(<BookingRow booking={BOOKING} displayZone="Europe/Kyiv" />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/schedule/room-42?week=2026-06-01');
  });

  it('shows a Cancel action when a click handler is supplied', () => {
    render(<BookingRow booking={BOOKING} displayZone="Europe/Kyiv" onCancelClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Cancelled')).not.toBeInTheDocument();
  });

  it('shows a Cancelled indicator for a past cancelled booking with no cancel handler', () => {
    render(<BookingRow booking={{ ...BOOKING, status: 'CANCELLED' }} displayZone="Europe/Kyiv" />);

    expect(screen.getByLabelText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('shows a "Recurring booking" note when part of a series', () => {
    render(<BookingRow booking={{ ...BOOKING, seriesId: 'series-1' }} displayZone="Europe/Kyiv" />);

    expect(screen.getByText('Recurring booking')).toBeInTheDocument();
  });
});
