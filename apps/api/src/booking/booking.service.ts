import { Injectable, NotFoundException } from '@nestjs/common';
import type { BookingSummary } from 'shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import type { AuthenticatedUser } from '../auth/auth.service';

const BOOKING_WITH_AUTHOR_SELECT = {
  id: true,
  roomId: true,
  title: true,
  startAt: true,
  endAt: true,
  seriesId: true,
  userId: true,
  user: { select: { name: true } },
} as const;

type BookingWithAuthor = {
  id: string;
  roomId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  seriesId: string | null;
  userId: string;
  user: { name: string };
};

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookingDto, user: AuthenticatedUser): Promise<BookingSummary> {
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      select: { id: true },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const created = await this.prisma.booking.create({
      data: {
        title: dto.title,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        roomId: dto.roomId,
        userId: user.id,
      },
      select: BOOKING_WITH_AUTHOR_SELECT,
    });

    return this.toSummary(created, user.id);
  }

  private toSummary(booking: BookingWithAuthor, requesterId: string): BookingSummary {
    return {
      id: booking.id,
      roomId: booking.roomId,
      title: booking.title,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      authorName: booking.user.name,
      isOwnBooking: booking.userId === requesterId,
      seriesId: booking.seriesId,
    };
  }
}
