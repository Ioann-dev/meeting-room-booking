import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './guards/session.guard';
import { EmailVerifiedGuard } from './guards/email-verified.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, EmailVerifiedGuard],
  exports: [AuthService, SessionGuard, EmailVerifiedGuard],
})
export class AuthModule {}
