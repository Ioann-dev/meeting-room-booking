import { render, screen } from '@testing-library/react';
import type { BookingSummary } from 'shared';
import { BookingDetailDialog } from './booking-detail-dialog';

const BOOKING: BookingSummary = {
  id: 'booking-1',
  roomId: 'room-1',
  title: 'Sprint planning',
  startAt: '2026-06-03T09:00:00.000Z',
  endAt: '2026-06-03T10:00:00.000Z',
  authorName: 'Ada Lovelace',
  isOwnBooking: false,
  seriesId: null,
};

function renderDialog(startDayOffset: number, endDayOffset: number) {
  return render(
    <BookingDetailDialog
      booking={BOOKING}
      onOpenChange={() => {}}
      browserStartLabel="12:00"
      browserEndLabel="13:00"
      browserStartDayOffset={startDayOffset}
      browserEndDayOffset={endDayOffset}
      officeStartLabel="12:00"
      officeEndLabel="13:00"
      showOfficeEquivalent={false}
    />,
  );
}

describe('BookingDetailDialog day-offset presentation', () => {
  it('shows no relative-day marker when the viewer-local date matches the Kyiv-anchored date', () => {
    renderDialog(0, 0);
    expect(screen.queryByText(/\dd\)/)).not.toBeInTheDocument();
  });

  it('marks a viewer-local time that falls on the next calendar day', () => {
    renderDialog(0, 1);
    expect(screen.getByText('(+1d)')).toBeInTheDocument();
  });

  it('marks a viewer-local time that falls on the previous calendar day', () => {
    renderDialog(-1, 0);
    expect(screen.getByText('(-1d)')).toBeInTheDocument();
  });

  it('marks start and end independently when only one crosses a day boundary', () => {
    renderDialog(0, 1);
    expect(screen.queryByText('(0d)')).not.toBeInTheDocument();
    expect(screen.getAllByText('(+1d)')).toHaveLength(1);
  });
});
