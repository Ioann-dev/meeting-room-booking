import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import type { RoomSummary } from 'shared';
import { RoomsService } from './rooms.service';
import { SessionGuard } from '../auth/guards/session.guard';

@Controller('rooms')
@UseGuards(SessionGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(): Promise<RoomSummary[]> {
    return this.roomsService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoomSummary> {
    return this.roomsService.findById(id);
  }
}
