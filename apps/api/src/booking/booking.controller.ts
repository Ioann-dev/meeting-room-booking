import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { BookingSummary } from 'shared';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
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
}
