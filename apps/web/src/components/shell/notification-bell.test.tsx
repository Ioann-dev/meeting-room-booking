import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui/toast';
import { fetchNotifications, markAllNotificationsRead } from '@/lib/notifications-client';
import { NotificationBell } from './notification-bell';

jest.mock('@/lib/notifications-client', () => ({
  fetchNotifications: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

const mockedFetch = jest.mocked(fetchNotifications);
const mockedMarkAllRead = jest.mocked(markAllNotificationsRead);

function renderBell() {
  return render(
    <ToastProvider>
      <NotificationBell />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedMarkAllRead.mockReset();
  mockedMarkAllRead.mockResolvedValue(undefined);
});

describe('NotificationBell', () => {
  it('shows an unread-count badge and names it in the accessible label', async () => {
    mockedFetch.mockResolvedValue({
      items: [
        {
          id: 'n1',
          type: 'BOOKING_ENDING_SOON',
          roomName: 'Athens',
          endingBookingTitle: 'Sprint planning',
          endingBookingEndAt: '2026-06-03T10:00:00.000Z',
          createdAt: '2026-06-03T09:55:00.000Z',
          readAt: null,
          justDelivered: false,
        },
      ],
      unreadCount: 3,
    });
    renderBell();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument(),
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('lists recent notifications and marks them read when the panel opens', async () => {
    mockedFetch.mockResolvedValue({
      items: [
        {
          id: 'n1',
          type: 'BOOKING_ENDING_SOON',
          roomName: 'Athens',
          endingBookingTitle: 'Sprint planning',
          endingBookingEndAt: '2026-06-03T10:00:00.000Z',
          createdAt: '2026-06-03T09:55:00.000Z',
          readAt: null,
          justDelivered: false,
        },
      ],
      unreadCount: 1,
    });
    const user = userEvent.setup();
    renderBell();

    const trigger = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
    await user.click(trigger);

    expect(await screen.findByText(/Sprint planning/)).toBeInTheDocument();
    expect(screen.getByText(/Athens/)).toBeInTheDocument();
    await waitFor(() => expect(mockedMarkAllRead).toHaveBeenCalledTimes(1));
  });

  it('shows an empty state when there are no notifications', async () => {
    mockedFetch.mockResolvedValue({ items: [], unreadCount: 0 });
    const user = userEvent.setup();
    renderBell();

    const trigger = await screen.findByRole('button', { name: 'Notifications' });
    await user.click(trigger);

    expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
  });

  it('shows a toast for a notification flagged justDelivered', async () => {
    mockedFetch.mockResolvedValue({
      items: [
        {
          id: 'n1',
          type: 'BOOKING_ENDING_SOON',
          roomName: 'Athens',
          endingBookingTitle: 'Sprint planning',
          endingBookingEndAt: '2026-06-03T10:00:00.000Z',
          createdAt: '2026-06-03T09:55:00.000Z',
          readAt: null,
          justDelivered: true,
        },
      ],
      unreadCount: 1,
    });
    renderBell();

    expect(
      await screen.findByText(
        'Your booking "Sprint planning" in Athens ends soon -- the next slot is booked.',
      ),
    ).toBeInTheDocument();
  });
});
