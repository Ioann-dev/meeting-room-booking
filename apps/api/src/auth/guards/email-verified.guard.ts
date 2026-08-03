import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../authenticated-request';

// Not wired to any route yet -- booking creation (Phase 05) will compose
// this after SessionGuard, e.g. @UseGuards(SessionGuard, EmailVerifiedGuard),
// to require a verified email before creating a booking.
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user.emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email address to continue');
    }
    return true;
  }
}
