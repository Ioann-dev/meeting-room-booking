import { Injectable, NotFoundException } from '@nestjs/common';
import type { RoomSummary } from 'shared';
import { PrismaService } from '../prisma/prisma.service';

const ROOM_SUMMARY_SELECT = { id: true, name: true, floor: true, capacity: true } as const;

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<RoomSummary[]> {
    return this.prisma.room.findMany({
      orderBy: { name: 'asc' },
      select: ROOM_SUMMARY_SELECT,
    });
  }

  async findById(id: string): Promise<RoomSummary> {
    const room = await this.prisma.room.findUnique({
      where: { id },
      select: ROOM_SUMMARY_SELECT,
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }
}
