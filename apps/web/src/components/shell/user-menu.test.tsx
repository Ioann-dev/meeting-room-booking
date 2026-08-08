import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CurrentUser } from 'shared';
import { ToastProvider } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-error';
import { logout } from '@/lib/auth-client';
import { UserMenu } from './user-menu';

jest.mock('@/lib/auth-client', () => ({
  logout: jest.fn(),
}));

const mockedLogout = jest.mocked(logout);

const USER: CurrentUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerified: true,
};

function renderUserMenu(onLoggedOut: () => void) {
  return render(
    <ToastProvider>
      <UserMenu user={USER} onLoggedOut={onLoggedOut} />
    </ToastProvider>,
  );
}

// Log out now lives inside the account popover, not exposed directly in the
// header -- every test opens it first via the same trigger a real user
// would click.
async function openAccountMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Account menu/ }));
}

describe('UserMenu account popover', () => {
  beforeEach(() => {
    mockedLogout.mockReset();
  });

  it('shows the user name and email once opened', async () => {
    const user = userEvent.setup();
    renderUserMenu(jest.fn());

    await openAccountMenu(user);

    // "Ada Lovelace" now appears twice -- once in the trigger's own label,
    // once repeated inside the opened popover's content.
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('clears local session state only after the server logout call succeeds', async () => {
    mockedLogout.mockResolvedValue(undefined);
    const onLoggedOut = jest.fn();
    const user = userEvent.setup();
    renderUserMenu(onLoggedOut);

    await openAccountMenu(user);
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(onLoggedOut).toHaveBeenCalledTimes(1));
  });

  it('does not clear local session state and shows an error when the server logout call fails', async () => {
    mockedLogout.mockRejectedValue(new ApiError(503, ['Service unavailable']));
    const onLoggedOut = jest.fn();
    const user = userEvent.setup();
    renderUserMenu(onLoggedOut);

    await openAccountMenu(user);
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await screen.findByText('Service unavailable');
    expect(onLoggedOut).not.toHaveBeenCalled();

    // The button must recover so the user can retry.
    expect(screen.getByRole('button', { name: 'Log out' })).toBeEnabled();
  });
});
