import { render, screen, waitFor, within } from '@testing-library/react';
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
      displayZone={OFFICE_TIMEZONE}
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

  it('clears the title error as soon as a valid title is typed, without resubmitting', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Book room' }));
    const titleInput = await screen.findByLabelText('Title');
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(titleInput).toHaveAttribute('aria-invalid', 'true');

    await user.type(titleInput, 'Sprint planning');

    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    expect(titleInput).toHaveAttribute('aria-invalid', 'false');
  });

  it('clears the occurrence-count error as soon as a valid count is typed', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Sprint planning');
    await user.click(screen.getByLabelText('Repeat weekly'));
    const occurrenceInput = screen.getByLabelText('Number of occurrences');
    await user.clear(occurrenceInput);
    await user.type(occurrenceInput, '1');
    await user.click(screen.getByRole('button', { name: 'Book room' }));
    expect(await screen.findByText(/Enter a whole number between 2 and 52/)).toBeInTheDocument();

    await user.clear(occurrenceInput);
    await user.type(occurrenceInput, '8');

    expect(screen.queryByText(/Enter a whole number between 2 and 52/)).not.toBeInTheDocument();
  });
});

describe('BookingCreateDialog viewer-zone time display (F1)', () => {
  beforeEach(() => {
    mockedCreateBooking.mockReset();
  });

  it('shows Start/End options in the Europe/Berlin viewer zone, with the Kyiv office time as secondary context', () => {
    // WEEK_START_UTC is 2026-06-01 00:00 Kyiv; office open (09:00 Kyiv) is
    // Berlin 08:00 on the same June date (Kyiv EEST +3, Berlin CEST +2).
    renderDialog({ displayZone: 'Europe/Berlin' });

    const startSelect = screen.getByLabelText('Start');
    expect(within(startSelect).getAllByRole('option')[0]).toHaveTextContent('08:00 · Office 09:00');
  });

  it('flags a viewer-local date that differs from the Kyiv business day being browsed', () => {
    // Kyiv 09:00 on 2026-06-01 is 2026-05-31 20:00 in Pacific/Honolulu
    // (UTC-10, no DST) -- the previous viewer-local calendar day.
    renderDialog({ displayZone: 'Pacific/Honolulu' });

    const startSelect = screen.getByLabelText('Start');
    expect(within(startSelect).getAllByRole('option')[0]).toHaveTextContent(
      '20:00 (-1d) · Office 09:00',
    );
  });

  it('submits the same underlying instant regardless of the viewer display zone', async () => {
    const user = userEvent.setup();
    mockedCreateBooking.mockResolvedValue({
      id: 'booking-1',
      roomId: ROOM.id,
      title: 'Sprint planning',
      startAt: SLOT_START,
      endAt: SLOT_START,
      authorName: 'Ada Lovelace',
      isOwnBooking: true,
      seriesId: null,
    });
    renderDialog({ initialSlotStart: SLOT_START, displayZone: 'Pacific/Honolulu' });

    await user.type(screen.getByLabelText('Title'), 'Sprint planning');
    await user.click(screen.getByRole('button', { name: 'Book room' }));

    await waitFor(() =>
      expect(mockedCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({ startAt: SLOT_START }),
      ),
    );
  });

  it('does not claim times are shown in the office zone', () => {
    renderDialog({ displayZone: 'Europe/Berlin' });
    expect(screen.queryByText(/Times are shown in the office zone/i)).not.toBeInTheDocument();
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
