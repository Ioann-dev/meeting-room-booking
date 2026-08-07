import { render, screen } from '@testing-library/react';
import type { CurrentUser } from 'shared';
import { ToastProvider } from '@/components/ui/toast';
import { fetchNotifications } from '@/lib/notifications-client';
import { AppHeader } from './app-header';

jest.mock('next/navigation', () => ({
  usePathname: () => '/schedule',
}));

jest.mock('@/lib/notifications-client', () => ({
  fetchNotifications: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

const mockedFetchNotifications = jest.mocked(fetchNotifications);

const USER: CurrentUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerified: true,
};

function renderHeader() {
  return render(
    <ToastProvider>
      <AppHeader user={USER} onLoggedOut={jest.fn()} />
    </ToastProvider>,
  );
}

describe('AppHeader notification bell placement', () => {
  beforeEach(() => {
    mockedFetchNotifications.mockReset();
    mockedFetchNotifications.mockResolvedValue({ items: [], unreadCount: 0 });
  });

  // jsdom doesn't evaluate the md: breakpoint that decides which cluster is
  // actually visible at a given width (that's covered by
  // e2e/mobile-notifications.spec.ts against a real browser instead); this
  // proves the structural fix -- a reachable bell exists in *both* the
  // desktop cluster and the mobile-only header area, not only one -- since
  // regressing back to a single instance is exactly what D5 was.
  it('renders a reachable notification bell trigger for both the desktop and mobile header clusters', async () => {
    renderHeader();

    const triggers = await screen.findAllByRole('button', { name: 'Notifications' });
    expect(triggers).toHaveLength(2);
  });

  it('keeps the mobile menu trigger present alongside the mobile bell', async () => {
    renderHeader();

    await screen.findAllByRole('button', { name: 'Notifications' });
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });
});
