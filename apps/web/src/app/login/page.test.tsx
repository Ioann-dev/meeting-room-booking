import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ApiError } from '@/lib/api-error';
import { login } from '@/lib/auth-client';
import LoginPage from './page';

const replace = jest.fn();
const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, refresh: jest.fn() }),
}));

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('@/lib/auth-client', () => ({
  login: jest.fn(),
}));

const mockedUseCurrentUser = jest.mocked(useCurrentUser);
const mockedLogin = jest.mocked(login);

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
    mockedLogin.mockReset();
    push.mockReset();
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

  it('shows a field-level error for a malformed email and never calls the API (F8)', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('submits normally once the email is syntactically valid (F8)', async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      emailVerified: true,
    });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(mockedLogin).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'password123',
      }),
    );
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
  });

  it('shows an invalid-credentials failure as a top-level alert, not a field error (F8)', async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValue(new ApiError(401, ['Invalid email or password']));
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false');
  });
});
