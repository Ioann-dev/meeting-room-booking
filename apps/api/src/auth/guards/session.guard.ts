import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../authenticated-request';
import { SESSION_COOKIE_NAME } from '../auth.constants';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawToken: unknown = (request.cookies as Record<string, unknown> | undefined)?.[
      SESSION_COOKIE_NAME
    ];

    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw new UnauthorizedException('Not authenticated');
    }

    const result = await this.authService.validateSessionToken(rawToken);
    if (!result) {
      throw new UnauthorizedException('Not authenticated');
    }

    request.user = result.user;
    request.sessionId = result.sessionId;
    return true;
  }
}
