import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCurrentUser } from '@/hooks/use-current-user';
import RegisterPage from './page';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: jest.fn(),
}));

const mockedUseCurrentUser = jest.mocked(useCurrentUser);

describe('RegisterPage authenticated redirect', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it('shows the registration form for an unauthenticated visitor', () => {
    mockedUseCurrentUser.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
      clearUser: jest.fn(),
    });

    render(<RegisterPage />);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects an already-authenticated visitor to /schedule instead of showing the form', async () => {
    mockedUseCurrentUser.mockReturnValue({
      status: 'authenticated',
      user: { id: 'u1', name: 'Ada', email: 'ada@example.com', emailVerified: true },
      refresh: jest.fn(),
      setUser: jest.fn(),
      clearUser: jest.fn(),
    });

    render(<RegisterPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/schedule'));
    expect(screen.queryByRole('heading', { name: 'Create your account' })).not.toBeInTheDocument();
  });
});

describe('RegisterPage field validation', () => {
  beforeEach(() => {
    mockedUseCurrentUser.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
      clearUser: jest.fn(),
    });
  });

  it('clears the password error as soon as a valid password is typed, without resubmitting', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const passwordInput = await screen.findByLabelText('Password');
    expect(screen.getByText(/Password must be between 8 and 72 characters/)).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');

    await user.type(passwordInput, 'ValidPassword123');

    expect(
      screen.queryByText(/Password must be between 8 and 72 characters/),
    ).not.toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
  });
});
