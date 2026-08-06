import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import type { BookingSummary } from 'shared';
import { ApiError } from '@/lib/api-error';
import { cancelBooking, cancelBookingSeries } from '@/lib/booking-client';
import { BookingDetailDialog } from './booking-detail-dialog';

jest.mock('@/lib/booking-client', () => ({
  cancelBooking: jest.fn(),
  cancelBookingSeries: jest.fn(),
}));

const mockedCancelBooking = jest.mocked(cancelBooking);
const mockedCancelBookingSeries = jest.mocked(cancelBookingSeries);

const OTHERS_BOOKING: BookingSummary = {
  id: 'booking-1',
  roomId: 'room-1',
  title: 'Sprint planning',
  startAt: '2026-06-03T09:00:00.000Z',
  endAt: '2026-06-03T10:00:00.000Z',
  authorName: 'Ada Lovelace',
  isOwnBooking: false,
  seriesId: null,
};

const OWN_BOOKING: BookingSummary = {
  ...OTHERS_BOOKING,
  id: 'booking-2',
  isOwnBooking: true,
  seriesId: null,
};

const OWN_SERIES_OCCURRENCE: BookingSummary = {
  ...OTHERS_BOOKING,
  id: 'booking-3',
  isOwnBooking: true,
  seriesId: 'series-1',
};

function renderDialog(overrides: Partial<ComponentProps<typeof BookingDetailDialog>> = {}) {
  const onOpenChange = jest.fn();
  const onCancelled = jest.fn();
  render(
    <BookingDetailDialog
      booking={OTHERS_BOOKING}
      onOpenChange={onOpenChange}
      onCancelled={onCancelled}
      browserStartLabel="12:00"
      browserEndLabel="13:00"
      browserStartDayOffset={0}
      browserEndDayOffset={0}
      officeStartLabel="12:00"
      officeEndLabel="13:00"
      showOfficeEquivalent={false}
      {...overrides}
    />,
  );
  return { onOpenChange, onCancelled };
}

describe('BookingDetailDialog day-offset presentation', () => {
  it('shows no relative-day marker when the viewer-local date matches the Kyiv-anchored date', () => {
    renderDialog({ browserStartDayOffset: 0, browserEndDayOffset: 0 });
    expect(screen.queryByText(/\dd\)/)).not.toBeInTheDocument();
  });

  it('marks a viewer-local time that falls on the next calendar day', () => {
    renderDialog({ browserStartDayOffset: 0, browserEndDayOffset: 1 });
    expect(screen.getByText('(+1d)')).toBeInTheDocument();
  });

  it('marks a viewer-local time that falls on the previous calendar day', () => {
    renderDialog({ browserStartDayOffset: -1, browserEndDayOffset: 0 });
    expect(screen.getByText('(-1d)')).toBeInTheDocument();
  });

  it('marks start and end independently when only one crosses a day boundary', () => {
    renderDialog({ browserStartDayOffset: 0, browserEndDayOffset: 1 });
    expect(screen.queryByText('(0d)')).not.toBeInTheDocument();
    expect(screen.getAllByText('(+1d)')).toHaveLength(1);
  });
});

describe('BookingDetailDialog cancellation ownership', () => {
  it("offers no cancel action on another attendee's booking", () => {
    renderDialog({ booking: OTHERS_BOOKING });
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it("offers a cancel action on the viewer's own booking", () => {
    renderDialog({ booking: OWN_BOOKING });
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
  });
});

describe('BookingDetailDialog single-booking cancellation', () => {
  beforeEach(() => {
    mockedCancelBooking.mockReset();
    mockedCancelBookingSeries.mockReset();
  });

  it('requires confirmation and returns to the detail view on "Keep booking"', async () => {
    const user = userEvent.setup();
    renderDialog({ booking: OWN_BOOKING });

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect(await screen.findByText(/This can't be undone/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep booking' }));
    expect(screen.queryByText(/This can't be undone/)).not.toBeInTheDocument();
    expect(mockedCancelBooking).not.toHaveBeenCalled();
  });

  it('cancels the booking and reports scope "single" on confirm', async () => {
    mockedCancelBooking.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onCancelled } = renderDialog({ booking: OWN_BOOKING });

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));

    await waitFor(() => expect(mockedCancelBooking).toHaveBeenCalledWith(OWN_BOOKING.id));
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith('single'));
  });

  it('disables the confirm button while the cancellation is pending', async () => {
    mockedCancelBooking.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderDialog({ booking: OWN_BOOKING });

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));

    const confirmButton = await screen.findByRole('button', { name: 'Cancel booking' });
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an inline error and stays open when cancellation fails', async () => {
    mockedCancelBooking.mockRejectedValue(
      new ApiError(403, ['You can only cancel your own booking'], 'FORBIDDEN_CANCELLATION'),
    );
    const user = userEvent.setup();
    const { onCancelled } = renderDialog({ booking: OWN_BOOKING });

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));

    expect(await screen.findByText('You can only cancel your own booking')).toBeInTheDocument();
    expect(onCancelled).not.toHaveBeenCalled();
  });
});

describe('BookingDetailDialog recurring-series cancellation', () => {
  beforeEach(() => {
    mockedCancelBooking.mockReset();
    mockedCancelBookingSeries.mockReset();
  });

  it('offers an occurrence-vs-series choice instead of a single confirm', async () => {
    const user = userEvent.setup();
    renderDialog({ booking: OWN_SERIES_OCCURRENCE });

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));

    expect(
      await screen.findByRole('button', { name: 'Cancel this occurrence' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel entire series' })).toBeInTheDocument();
  });

  it('cancels only the occurrence and reports scope "occurrence"', async () => {
    mockedCancelBooking.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onCancelled } = renderDialog({ booking: OWN_SERIES_OCCURRENCE });

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel this occurrence' }));

    await waitFor(() => expect(mockedCancelBooking).toHaveBeenCalledWith(OWN_SERIES_OCCURRENCE.id));
    expect(mockedCancelBookingSeries).not.toHaveBeenCalled();
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith('occurrence'));
  });

  it('cancels the whole series and reports scope "series"', async () => {
    mockedCancelBookingSeries.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onCancelled } = renderDialog({ booking: OWN_SERIES_OCCURRENCE });

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel entire series' }));

    await waitFor(() =>
      expect(mockedCancelBookingSeries).toHaveBeenCalledWith(OWN_SERIES_OCCURRENCE.seriesId),
    );
    expect(mockedCancelBooking).not.toHaveBeenCalled();
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith('series'));
  });
});
