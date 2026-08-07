import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ApiError } from '@/lib/api-error';
import { register } from '@/lib/auth-client';
import RegisterPage from './page';

const replace = jest.fn();
const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, refresh: jest.fn() }),
}));

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('@/lib/auth-client', () => ({
  register: jest.fn(),
}));

const mockedUseCurrentUser = jest.mocked(useCurrentUser);
const mockedRegister = jest.mocked(register);

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
    mockedRegister.mockReset();
    push.mockReset();
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

  it('shows a field-level error for a malformed email and never calls the API (F8)', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'ValidPassword123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('submits normally once the email is syntactically valid (F8)', async () => {
    const user = userEvent.setup();
    mockedRegister.mockResolvedValue({
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      emailVerified: false,
    });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'ValidPassword123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(mockedRegister).toHaveBeenCalledWith({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'ValidPassword123',
      }),
    );
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
  });

  it('shows a server registration failure as a top-level alert, not a field error (F8)', async () => {
    const user = userEvent.setup();
    mockedRegister.mockRejectedValue(new ApiError(409, ['Email is already registered']));
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'ValidPassword123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Email is already registered')).toBeInTheDocument();
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false');
  });
});
