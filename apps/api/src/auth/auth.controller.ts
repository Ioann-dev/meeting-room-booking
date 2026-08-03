import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { CurrentUser as CurrentUserDto } from 'shared';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SessionGuard } from './guards/session.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedRequest } from './authenticated-request';
import type { AuthenticatedUser } from './auth.service';
import { SESSION_COOKIE_NAME } from './auth.constants';
import { sessionCookieOptions } from './cookie.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUserDto> {
    const { user, sessionToken } = await this.authService.register(dto);
    res.cookie(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(req));
    return this.authService.toCurrentUser(user);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthenticatedRequest,
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
