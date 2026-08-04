import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CurrentUser } from 'shared';
import { ToastProvider } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-error';
import { logout } from '@/lib/auth-client';
import { MobileNav } from './mobile-nav';

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

function renderMobileNav(onLoggedOut: () => void, onOpenChange: (open: boolean) => void) {
  const triggerRef = createRef<HTMLButtonElement>();
  return render(
    <ToastProvider>
      <MobileNav
        open
        onOpenChange={onOpenChange}
        user={USER}
        onLoggedOut={onLoggedOut}
        triggerRef={triggerRef}
      />
    </ToastProvider>,
  );
}

describe('MobileNav logout', () => {
  beforeEach(() => {
    mockedLogout.mockReset();
  });

  it('closes the sheet and clears local session state once the server logout call succeeds', async () => {
    mockedLogout.mockResolvedValue(undefined);
    const onLoggedOut = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    renderMobileNav(onLoggedOut, onOpenChange);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(onLoggedOut).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the sheet open and shows an error when the server logout call fails', async () => {
    mockedLogout.mockRejectedValue(new ApiError(503, ['Service unavailable']));
    const onLoggedOut = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    renderMobileNav(onLoggedOut, onOpenChange);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await screen.findByText('Service unavailable');
    expect(onLoggedOut).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
