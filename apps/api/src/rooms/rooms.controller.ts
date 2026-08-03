import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import type { RoomSummary } from 'shared';
import { RoomsService } from './rooms.service';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { SessionGuard } from '../auth/guards/session.guard';

@Controller('rooms')
@UseGuards(SessionGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(@Query() query: ListRoomsDto): Promise<RoomSummary[]> {
    return this.roomsService.list(query.minCapacity);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoomSummary> {
    return this.roomsService.findById(id);
  }
}
