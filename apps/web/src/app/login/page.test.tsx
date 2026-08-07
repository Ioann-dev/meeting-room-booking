import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCurrentUser } from '@/hooks/use-current-user';
import LoginPage from './page';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: jest.fn(),
}));

const mockedUseCurrentUser = jest.mocked(useCurrentUser);

describe('LoginPage authenticated redirect', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it('shows the login form for an unauthenticated visitor', () => {
    mockedUseCurrentUser.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
      clearUser: jest.fn(),
    });

    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders the form while the session check is still pending, without redirecting', () => {
    mockedUseCurrentUser.mockReturnValue({
      status: 'loading',
      user: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
      clearUser: jest.fn(),
    });

    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
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

    render(<LoginPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/schedule'));
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument();
  });
});

describe('LoginPage field validation', () => {
  beforeEach(() => {
    mockedUseCurrentUser.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
      clearUser: jest.fn(),
    });
  });

  it('clears the email error as soon as a value is typed, without resubmitting', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Log in' }));
    const emailInput = await screen.findByLabelText('Email');
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');

    await user.type(emailInput, 'alice@example.com');

    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');
  });
});
