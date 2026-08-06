import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { NotificationsResponse } from 'shared';
import { NotificationsService } from './notifications.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';

@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<NotificationsResponse> {
    return this.notificationsService.listForUser(user.id);
  }

  @Post('read-all')
  @HttpCode(204)
  readAll(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.notificationsService.markAllRead(user.id);
  }
}
