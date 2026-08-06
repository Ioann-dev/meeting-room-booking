import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MyBookingSummary } from 'shared';
import { ToastProvider } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-error';
import { cancelBooking } from '@/lib/booking-client';
import { fetchMyUpcomingBookings } from '@/lib/my-bookings-client';
import { UpcomingSection } from './upcoming-section';

jest.mock('@/lib/my-bookings-client', () => ({
  fetchMyUpcomingBookings: jest.fn(),
}));
jest.mock('@/lib/booking-client', () => ({
  cancelBooking: jest.fn(),
  cancelBookingSeries: jest.fn(),
}));

const mockedFetch = jest.mocked(fetchMyUpcomingBookings);
const mockedCancelBooking = jest.mocked(cancelBooking);

const BOOKING: MyBookingSummary = {
  id: 'booking-1',
  roomId: 'room-1',
  roomName: 'Athens',
  title: 'Sprint planning',
  startAt: '2026-06-03T09:00:00.000Z',
  endAt: '2026-06-03T10:00:00.000Z',
  status: 'ACTIVE',
  seriesId: null,
};

function renderSection() {
  return render(
    <ToastProvider>
      <UpcomingSection displayZone="Europe/Kyiv" />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedCancelBooking.mockReset();
});

describe('UpcomingSection', () => {
  it('renders the fetched bookings', async () => {
    mockedFetch.mockResolvedValue({ items: [BOOKING] });
    renderSection();

    expect(await screen.findByText('Sprint planning')).toBeInTheDocument();
    expect(screen.getByText('Athens')).toBeInTheDocument();
  });

  it('shows an empty state with a link back to the schedule', async () => {
    mockedFetch.mockResolvedValue({ items: [] });
    renderSection();

    expect(await screen.findByText('No upcoming bookings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse rooms' })).toHaveAttribute('href', '/schedule');
  });

  it('shows an error state with a working retry', async () => {
    mockedFetch.mockRejectedValueOnce(new ApiError(500, ['Server error']));
    mockedFetch.mockResolvedValueOnce({ items: [BOOKING] });
    const user = userEvent.setup();
    renderSection();

    expect(await screen.findByText('Could not load your upcoming bookings')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Sprint planning')).toBeInTheDocument();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('cancels a booking from its row and refetches the list', async () => {
    mockedFetch.mockResolvedValue({ items: [BOOKING] });
    mockedCancelBooking.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));

    await waitFor(() => expect(mockedCancelBooking).toHaveBeenCalledWith(BOOKING.id));
    await screen.findByText('Booking cancelled.');
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
  });
});
