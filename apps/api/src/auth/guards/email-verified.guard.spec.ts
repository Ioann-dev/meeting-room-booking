import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { EmailVerifiedGuard } from './email-verified.guard';
import { AuthenticatedRequest } from '../authenticated-request';
import { AuthenticatedUser } from '../auth.service';

function contextWithUser(user: AuthenticatedUser): ExecutionContext {
  const request = { user } as AuthenticatedRequest;
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('EmailVerifiedGuard', () => {
  const guard = new EmailVerifiedGuard();
  const baseUser: AuthenticatedUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerifiedAt: null,
  };

  it('allows a user whose email is verified', () => {
    const context = contextWithUser({ ...baseUser, emailVerifiedAt: new Date() });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a user whose email is not verified', () => {
    const context = contextWithUser({ ...baseUser, emailVerifiedAt: null });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
