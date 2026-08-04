import { render, screen, waitFor } from '@testing-library/react';
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
