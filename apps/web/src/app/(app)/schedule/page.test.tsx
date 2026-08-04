import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RoomSummary } from 'shared';
import { fetchRooms } from '@/lib/rooms-client';
import SchedulePage from './page';

jest.mock('@/lib/rooms-client', () => ({
  fetchRooms: jest.fn(),
}));

const mockedFetchRooms = jest.mocked(fetchRooms);

const ROOMS: RoomSummary[] = [
  { id: 'room-1', name: 'Atrium', floor: 1, capacity: 4 },
  { id: 'room-2', name: 'Summit', floor: 3, capacity: 12 },
];

describe('SchedulePage capacity filter', () => {
  beforeEach(() => {
    mockedFetchRooms.mockReset();
    mockedFetchRooms.mockResolvedValue(ROOMS);
  });

  it('resolves the initial load out of the loading state', async () => {
    render(<SchedulePage />);

    await screen.findByText('Atrium');
    expect(mockedFetchRooms).toHaveBeenCalledTimes(1);
    expect(mockedFetchRooms).toHaveBeenCalledWith(undefined);
  });

  it('refetches when the effective capacity value actually changes', async () => {
    render(<SchedulePage />);
    await screen.findByText('Atrium');

    fireEvent.change(screen.getByLabelText('Minimum capacity'), { target: { value: '5' } });

    await waitFor(() => expect(mockedFetchRooms).toHaveBeenCalledTimes(2));
    expect(mockedFetchRooms).toHaveBeenLastCalledWith(5);
  });

  it('never leaves the room list stuck on the loading skeleton for input that normalizes to the same capacity', async () => {
    render(<SchedulePage />);
    await screen.findByText('Atrium');

    fireEvent.change(screen.getByLabelText('Minimum capacity'), { target: { value: '5' } });
    await waitFor(() => expect(mockedFetchRooms).toHaveBeenCalledTimes(2));
    await screen.findByText('Atrium');

    // "05" parses to the same effective capacity (5) as the current filter, so no
    // new fetch is expected - but the UI must not re-enter a loading state that
    // nothing will ever resolve out of.
    fireEvent.change(screen.getByLabelText('Minimum capacity'), { target: { value: '05' } });

    expect(mockedFetchRooms).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Atrium')).toBeInTheDocument();

    // Same reproduction from an invalid input: "" -> "-5" both normalize to "no filter".
    fireEvent.change(screen.getByLabelText('Minimum capacity'), { target: { value: '' } });
    await waitFor(() => expect(mockedFetchRooms).toHaveBeenCalledTimes(3));
    await screen.findByText('Atrium');

    fireEvent.change(screen.getByLabelText('Minimum capacity'), { target: { value: '-5' } });

    expect(mockedFetchRooms).toHaveBeenCalledTimes(3);
    expect(screen.getByText('Atrium')).toBeInTheDocument();
  });

  it('recovers from an empty filtered result when the filter is cleared', async () => {
    render(<SchedulePage />);
    await screen.findByText('Atrium');

    mockedFetchRooms.mockResolvedValueOnce([]);
    fireEvent.change(screen.getByLabelText('Minimum capacity'), { target: { value: '50' } });
    await screen.findByText('No rooms match this capacity');

    mockedFetchRooms.mockResolvedValueOnce(ROOMS);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));

    await screen.findByText('Atrium');
  });
});
