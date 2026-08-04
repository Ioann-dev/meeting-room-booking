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

describe('UserMenu logout', () => {
  beforeEach(() => {
    mockedLogout.mockReset();
  });

  it('clears local session state only after the server logout call succeeds', async () => {
    mockedLogout.mockResolvedValue(undefined);
    const onLoggedOut = jest.fn();
    const user = userEvent.setup();
    renderUserMenu(onLoggedOut);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(onLoggedOut).toHaveBeenCalledTimes(1));
  });

  it('does not clear local session state and shows an error when the server logout call fails', async () => {
    mockedLogout.mockRejectedValue(new ApiError(503, ['Service unavailable']));
    const onLoggedOut = jest.fn();
    const user = userEvent.setup();
    renderUserMenu(onLoggedOut);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await screen.findByText('Service unavailable');
    expect(onLoggedOut).not.toHaveBeenCalled();

    // The button must recover so the user can retry.
    expect(screen.getByRole('button', { name: 'Log out' })).toBeEnabled();
  });
});
