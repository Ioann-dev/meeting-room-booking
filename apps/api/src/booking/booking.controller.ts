import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import type { BookingSummary, RoomScheduleResponse } from 'shared';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';

@Controller('bookings')
@UseGuards(SessionGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(EmailVerifiedGuard)
  create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookingSummary> {
    return this.bookingService.create(dto, user);
  }

  @Get('schedule')
  schedule(
    @Query() query: ScheduleQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoomScheduleResponse> {
    return this.bookingService.getRoomSchedule(query.roomId, query.referenceDate, user.id);
  }
}
