import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BOOKING_ERROR_CODES } from 'shared';
import { AuthenticatedRequest } from '../authenticated-request';

// Wired onto POST /bookings (Phase 05) via
// @UseGuards(SessionGuard, EmailVerifiedGuard) to require a verified email
// before creating a booking.
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Defensive: this guard is only meaningful after SessionGuard has
    // populated request.user. If it's ever applied without SessionGuard
    // first, fail with a clean 401 instead of a TypeError-turned-500.
    if (!request.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    if (!request.user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: BOOKING_ERROR_CODES.EMAIL_NOT_VERIFIED,
        message: 'Please verify your email address to continue',
      });
    }
    return true;
  }
}
