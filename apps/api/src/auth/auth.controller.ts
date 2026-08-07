import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { CurrentUser as CurrentUserDto } from 'shared';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SessionGuard } from './guards/session.guard';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedRequest } from './authenticated-request';
import type { AuthenticatedUser } from './auth.service';
import { SESSION_COOKIE_NAME } from './auth.constants';
import { sessionCookieOptions } from './cookie.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Applied only to the two endpoints an attacker would actually hammer
  // (credential stuffing on login, account enumeration/spam via register),
  // not globally -- the read-mostly schedule/booking endpoints have no
  // comparable abuse case yet. AuthThrottlerGuard keys by the submitted
  // email rather than req.ip -- see its own comment for why IP-based
  // tracking doesn't hold up through apps/web's proxy. Uses the
  // ThrottlerModule default configured in app.module.ts (10 requests/minute).
  @UseGuards(AuthThrottlerGuard)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUserDto> {
    const { user, sessionToken } = await this.authService.register(dto);
    res.cookie(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(req));
    return this.authService.toCurrentUser(user);
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUserDto> {
    const { user, sessionToken } = await this.authService.login(dto);
    res.cookie(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(req));
    return this.authService.toCurrentUser(user);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(req.sessionId);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }

  @Post('verify-email')
  @HttpCode(204)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.authService.verifyEmail(dto);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: AuthenticatedUser): CurrentUserDto {
    return this.authService.toCurrentUser(user);
  }
}
