import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MyBookingSummary } from 'shared';
import { ApiError } from '@/lib/api-error';
import { fetchMyPastBookings } from '@/lib/my-bookings-client';
import { PastSection } from './past-section';

jest.mock('@/lib/my-bookings-client', () => ({
  fetchMyPastBookings: jest.fn(),
}));

const mockedFetch = jest.mocked(fetchMyPastBookings);

function booking(id: string, title: string): MyBookingSummary {
  return {
    id,
    roomId: 'room-1',
    roomName: 'Athens',
    title,
    startAt: '2026-06-01T09:00:00.000Z',
    endAt: '2026-06-01T10:00:00.000Z',
    status: 'ACTIVE',
    seriesId: null,
  };
}

beforeEach(() => {
  mockedFetch.mockReset();
});

describe('PastSection', () => {
  it('shows an empty state when there is no past history', async () => {
    mockedFetch.mockResolvedValue({ items: [], nextCursor: null });
    render(<PastSection displayZone="Europe/Kyiv" />);

    expect(await screen.findByText('No past bookings')).toBeInTheDocument();
  });

  it('shows an end-of-list note when there is no further page', async () => {
    mockedFetch.mockResolvedValue({ items: [booking('b1', 'Old meeting')], nextCursor: null });
    render(<PastSection displayZone="Europe/Kyiv" />);

    expect(await screen.findByText('Old meeting')).toBeInTheDocument();
    expect(screen.getByText("You've reached the end.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('loads and appends the next page on "Load more"', async () => {
    mockedFetch.mockResolvedValueOnce({
      items: [booking('b1', 'First page item')],
      nextCursor: 'cursor-1',
    });
    mockedFetch.mockResolvedValueOnce({
      items: [booking('b2', 'Second page item')],
      nextCursor: null,
    });
    const user = userEvent.setup();
    render(<PastSection displayZone="Europe/Kyiv" />);

    expect(await screen.findByText('First page item')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('Second page item')).toBeInTheDocument();
    expect(screen.getByText('First page item')).toBeInTheDocument();
    expect(mockedFetch).toHaveBeenLastCalledWith('cursor-1');
    expect(screen.getByText("You've reached the end.")).toBeInTheDocument();
  });

  it('shows an error state with a working retry for the initial load', async () => {
    mockedFetch.mockRejectedValueOnce(new ApiError(500, ['Server error']));
    mockedFetch.mockResolvedValueOnce({
      items: [booking('b1', 'Recovered item')],
      nextCursor: null,
    });
    const user = userEvent.setup();
    render(<PastSection displayZone="Europe/Kyiv" />);

    expect(await screen.findByText('Could not load your past bookings')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Recovered item')).toBeInTheDocument();
  });

  it('keeps already-loaded rows and shows an inline retry when loading more fails', async () => {
    mockedFetch.mockResolvedValueOnce({
      items: [booking('b1', 'First page item')],
      nextCursor: 'cursor-1',
    });
    mockedFetch.mockRejectedValueOnce(new ApiError(500, ['Server error']));
    mockedFetch.mockResolvedValueOnce({
      items: [booking('b2', 'Second page item')],
      nextCursor: null,
    });
    const user = userEvent.setup();
    render(<PastSection displayZone="Europe/Kyiv" />);

    await screen.findByText('First page item');
    await user.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.getByText('First page item')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Second page item')).toBeInTheDocument();
  });
});
