import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { BOOKING_ERROR_CODES, zonedWallTimeToUtc, OFFICE_TIMEZONE, type RoomSummary } from 'shared';
import { ApiError } from '@/lib/api-error';
import { createBooking } from '@/lib/booking-client';
import { BookingCreateDialog } from './booking-create-dialog';

jest.mock('@/lib/booking-client', () => ({
  createBooking: jest.fn(),
}));

const mockedCreateBooking = jest.mocked(createBooking);

const ROOM: RoomSummary = { id: 'room-1', name: 'Focus Room', floor: 2, capacity: 6 };
const WEEK_START_UTC = zonedWallTimeToUtc(
  { year: 2026, month: 6, day: 1, hour: 0, minute: 0 },
  OFFICE_TIMEZONE,
);
const SLOT_START = zonedWallTimeToUtc(
  { year: 2026, month: 6, day: 1, hour: 10, minute: 0 },
  OFFICE_TIMEZONE,
);

function renderDialog(overrides: Partial<ComponentProps<typeof BookingCreateDialog>> = {}) {
  const onOpenChange = jest.fn();
  const onCreated = jest.fn();
  render(
    <BookingCreateDialog
      open
      room={ROOM}
      weekStartUtc={WEEK_START_UTC}
      initialSlotStart={null}
      now={null}
      emailVerified
      onOpenChange={onOpenChange}
      onCreated={onCreated}
      {...overrides}
    />,
  );
  return { onOpenChange, onCreated };
}

describe('BookingCreateDialog pre-fill', () => {
  beforeEach(() => {
    mockedCreateBooking.mockReset();
  });

  it('pre-fills the date, start and a 30-minute end from the selected slot', () => {
    const expectedEnd = zonedWallTimeToUtc(
      { year: 2026, month: 6, day: 1, hour: 10, minute: 30 },
      OFFICE_TIMEZONE,
    );
    renderDialog({ initialSlotStart: SLOT_START });

    expect(screen.getByLabelText('Date')).toHaveValue('0');
    expect(screen.getByLabelText('Start')).toHaveValue(SLOT_START);
    expect(screen.getByLabelText('End')).toHaveValue(expectedEnd);
  });

  it('shows the email-verification warning when the current user is unverified', () => {
    renderDialog({ emailVerified: false });
    expect(screen.getByText(/Verify your email to book a room/i)).toBeInTheDocument();
  });
});

describe('BookingCreateDialog validation', () => {
  beforeEach(() => {
    mockedCreateBooking.mockReset();
  });

  it('blocks submission and shows a field error when the title is empty', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Book room' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(mockedCreateBooking).not.toHaveBeenCalled();
  });

  it('requires a valid occurrence count once recurrence is enabled', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Sprint planning');
    await user.click(screen.getByLabelText('Repeat weekly'));
    await user.clear(screen.getByLabelText('Number of occurrences'));
    await user.type(screen.getByLabelText('Number of occurrences'), '1');
    await user.click(screen.getByRole('button', { name: 'Book room' }));

    expect(await screen.findByText(/Enter a whole number between 2 and 52/)).toBeInTheDocument();
    expect(mockedCreateBooking).not.toHaveBeenCalled();
  });
});

describe('BookingCreateDialog submission states', () => {
  beforeEach(() => {
    mockedCreateBooking.mockReset();
  });

  it('disables the submit button while the request is pending', async () => {
    const user = userEvent.setup();
    mockedCreateBooking.mockImplementation(() => new Promise(() => {}));
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Sprint planning');
    await user.click(screen.getByRole('button', { name: 'Book room' }));

    const submitButton = await screen.findByRole('button', { name: 'Book room' });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
  });

  it('maps a booking-conflict error to actionable copy', async () => {
    const user = userEvent.setup();
    mockedCreateBooking.mockRejectedValue(
      new ApiError(409, ['This time slot is already booked'], BOOKING_ERROR_CODES.BOOKING_CONFLICT),
    );
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Sprint planning');
    await user.click(screen.getByRole('button', { name: 'Book room' }));

    expect(
      await screen.findByText('This slot was just booked by someone else. Pick another time.'),
    ).toBeInTheDocument();
  });

  it('calls onCreated with the server result on success', async () => {
    const user = userEvent.setup();
    const created = {
      id: 'booking-1',
      roomId: ROOM.id,
      title: 'Sprint planning',
      startAt: SLOT_START,
      endAt: SLOT_START,
      authorName: 'Ada Lovelace',
      isOwnBooking: true,
      seriesId: null,
    };
    mockedCreateBooking.mockResolvedValue(created);
    const { onCreated } = renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Sprint planning');
    await user.click(screen.getByRole('button', { name: 'Book room' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
  });
});
