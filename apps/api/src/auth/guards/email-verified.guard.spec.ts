import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { EmailVerifiedGuard } from './email-verified.guard';
import { AuthenticatedRequest } from '../authenticated-request';
import { AuthenticatedUser } from '../auth.service';

function contextWithUser(user: AuthenticatedUser | undefined): ExecutionContext {
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

  it('carries the EMAIL_NOT_VERIFIED code in the rejection body', () => {
    const context = contextWithUser({ ...baseUser, emailVerifiedAt: null });
    try {
      guard.canActivate(context);
      throw new Error('expected canActivate to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address to continue',
      });
    }
  });

  it('rejects with 401, not a crash, if used without SessionGuard populating request.user', () => {
    const context = contextWithUser(undefined);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
