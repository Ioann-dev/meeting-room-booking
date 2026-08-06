import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  BookingSeriesSummary,
  BookingSummary,
  MyPastBookingsResponse,
  MyUpcomingBookingsResponse,
  RoomScheduleResponse,
} from 'shared';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MyBookingsQueryDto } from './dto/my-bookings-query.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';

@Controller('bookings')
@UseGuards(SessionGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // A `recurrence` field in the body creates a weekly series instead of a
  // single booking; the two response shapes are structurally distinct
  // (BookingSeriesSummary has no top-level `id`), so no separate
  // discriminant field is needed for a client to tell them apart.
  @Post()
  @HttpCode(201)
  @UseGuards(EmailVerifiedGuard)
  create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookingSummary | BookingSeriesSummary> {
    return dto.recurrence
      ? this.bookingService.createSeries(dto, dto.recurrence, user)
      : this.bookingService.create(dto, user);
  }

  @Get('schedule')
  schedule(
    @Query() query: ScheduleQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoomScheduleResponse> {
    return this.bookingService.getRoomSchedule(query.roomId, query.referenceDate, user.id);
  }

  // scope=upcoming ignores cursor/limit entirely (see
  // BookingService.listMineUpcoming); scope=past is the paginated list.
  @Get('mine')
  mine(
    @Query() query: MyBookingsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyUpcomingBookingsResponse | MyPastBookingsResponse> {
    return query.scope === 'upcoming'
      ? this.bookingService.listMineUpcoming(user.id)
      : this.bookingService.listMinePast(user.id, query.cursor, query.limit);
  }

  // Cancels one occurrence -- a series occurrence is just a Booking row
  // with a seriesId, so this same endpoint already handles both plain
  // bookings and individual series occurrences with no special-casing.
  @Post(':id/cancel')
  @HttpCode(204)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.bookingService.cancel(id, user.id);
  }

  // Cancels every still-active occurrence of a series. A distinct route
  // (not `:id/cancel` reused with a query flag) since a series id and a
  // booking id are different resources with different ownership checks.
  @Post('series/:seriesId/cancel')
  @HttpCode(204)
  cancelSeries(
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.bookingService.cancelSeries(seriesId, user.id);
  }
}
