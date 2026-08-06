import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api-error';
import { cancelBooking, cancelBookingSeries } from '@/lib/booking-client';
import { BookingCancelPanel } from './booking-cancel-panel';

jest.mock('@/lib/booking-client', () => ({
  cancelBooking: jest.fn(),
  cancelBookingSeries: jest.fn(),
}));

const mockedCancelBooking = jest.mocked(cancelBooking);
const mockedCancelBookingSeries = jest.mocked(cancelBookingSeries);

const SINGLE_BOOKING = { id: 'booking-1', seriesId: null };
const SERIES_OCCURRENCE = { id: 'booking-2', seriesId: 'series-1' };

beforeEach(() => {
  mockedCancelBooking.mockReset();
  mockedCancelBookingSeries.mockReset();
});

describe('BookingCancelPanel single booking', () => {
  it('calls onKeepBooking without cancelling anything', async () => {
    const user = userEvent.setup();
    const onCancelled = jest.fn();
    const onKeepBooking = jest.fn();
    render(
      <BookingCancelPanel
        booking={SINGLE_BOOKING}
        onCancelled={onCancelled}
        onKeepBooking={onKeepBooking}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Keep booking' }));

    expect(onKeepBooking).toHaveBeenCalledTimes(1);
    expect(mockedCancelBooking).not.toHaveBeenCalled();
  });

  it('cancels via cancelBooking and reports scope "single"', async () => {
    mockedCancelBooking.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const onCancelled = jest.fn();
    render(
      <BookingCancelPanel
        booking={SINGLE_BOOKING}
        onCancelled={onCancelled}
        onKeepBooking={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));

    await waitFor(() => expect(mockedCancelBooking).toHaveBeenCalledWith(SINGLE_BOOKING.id));
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith('single'));
  });

  it('disables the confirm button while pending', async () => {
    mockedCancelBooking.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(
      <BookingCancelPanel
        booking={SINGLE_BOOKING}
        onCancelled={jest.fn()}
        onKeepBooking={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));

    const button = await screen.findByRole('button', { name: 'Cancel booking' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an inline error and stays on the confirm view when cancellation fails', async () => {
    mockedCancelBooking.mockRejectedValue(
      new ApiError(403, ['You can only cancel your own booking']),
    );
    const user = userEvent.setup();
    const onCancelled = jest.fn();
    render(
      <BookingCancelPanel
        booking={SINGLE_BOOKING}
        onCancelled={onCancelled}
        onKeepBooking={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));

    expect(await screen.findByText('You can only cancel your own booking')).toBeInTheDocument();
    expect(onCancelled).not.toHaveBeenCalled();
  });
});

describe('BookingCancelPanel recurring series', () => {
  it('offers occurrence vs series choices instead of a single confirm', () => {
    render(
      <BookingCancelPanel
        booking={SERIES_OCCURRENCE}
        onCancelled={jest.fn()}
        onKeepBooking={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel this occurrence' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel entire series' })).toBeInTheDocument();
    expect(
      screen.queryByText("Cancel this booking? This can't be undone."),
    ).not.toBeInTheDocument();
  });

  it('cancels only the occurrence via cancelBooking and reports scope "occurrence"', async () => {
    mockedCancelBooking.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const onCancelled = jest.fn();
    render(
      <BookingCancelPanel
        booking={SERIES_OCCURRENCE}
        onCancelled={onCancelled}
        onKeepBooking={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel this occurrence' }));

    await waitFor(() => expect(mockedCancelBooking).toHaveBeenCalledWith(SERIES_OCCURRENCE.id));
    expect(mockedCancelBookingSeries).not.toHaveBeenCalled();
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith('occurrence'));
  });

  it('cancels the whole series via cancelBookingSeries and reports scope "series"', async () => {
    mockedCancelBookingSeries.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const onCancelled = jest.fn();
    render(
      <BookingCancelPanel
        booking={SERIES_OCCURRENCE}
        onCancelled={onCancelled}
        onKeepBooking={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel entire series' }));

    await waitFor(() =>
      expect(mockedCancelBookingSeries).toHaveBeenCalledWith(SERIES_OCCURRENCE.seriesId),
    );
    expect(mockedCancelBooking).not.toHaveBeenCalled();
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith('series'));
  });
});
