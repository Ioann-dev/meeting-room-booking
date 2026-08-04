import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import type { AuthenticatedUser } from '../auth/auth.service';

const REQUESTER: AuthenticatedUser = {
  id: 'user-1',
  name: 'Ivan Test',
  email: 'ivan@example.com',
  emailVerifiedAt: new Date(),
};

function buildDto(overrides: Partial<CreateBookingDto> = {}): CreateBookingDto {
  const dto = new CreateBookingDto();
  dto.title = 'Sprint Planning';
  dto.roomId = 'room-1';
  dto.startAt = '2026-06-01T06:00:00.000Z'; // 09:00 Kyiv
  dto.endAt = '2026-06-01T06:30:00.000Z'; // 09:30 Kyiv
  return Object.assign(dto, overrides);
}

function buildService(overrides: {
  findUniqueRoom?: jest.Mock;
  create?: jest.Mock;
  findManyBooking?: jest.Mock;
  findUniqueBooking?: jest.Mock;
  update?: jest.Mock;
}) {
  const prisma = {
    room: {
      findUnique: overrides.findUniqueRoom ?? jest.fn().mockResolvedValue({ id: 'room-1' }),
    },
    booking: {
      create:
        overrides.create ??
        jest.fn().mockResolvedValue({
          id: 'booking-1',
          roomId: 'room-1',
          title: 'Sprint Planning',
          startAt: new Date('2026-06-01T06:00:00.000Z'),
          endAt: new Date('2026-06-01T06:30:00.000Z'),
          seriesId: null,
          userId: 'user-1',
          user: { name: 'Ivan Test' },
        }),
      findMany: overrides.findManyBooking ?? jest.fn().mockResolvedValue([]),
      findUnique: overrides.findUniqueBooking ?? jest.fn(),
      update: overrides.update ?? jest.fn(),
    },
  } as unknown as PrismaService;
  return new BookingService(prisma);
}

describe('BookingService.create', () => {
  it('throws NotFoundException when the room does not exist', async () => {
    const service = buildService({ findUniqueRoom: jest.fn().mockResolvedValue(null) });

    await expect(service.create(buildDto(), REQUESTER)).rejects.toThrow(NotFoundException);
  });

  it('persists the booking and returns a summary with ownership set', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'booking-1',
      roomId: 'room-1',
      title: 'Sprint Planning',
      startAt: new Date('2026-06-01T06:00:00.000Z'),
      endAt: new Date('2026-06-01T06:30:00.000Z'),
      seriesId: null,
      userId: 'user-1',
      user: { name: 'Ivan Test' },
    });
    const service = buildService({ create });

    const result = await service.create(buildDto(), REQUESTER);

    const [callArgs] = create.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(callArgs.data).toEqual({
      title: 'Sprint Planning',
      roomId: 'room-1',
      userId: 'user-1',
      startAt: new Date('2026-06-01T06:00:00.000Z'),
      endAt: new Date('2026-06-01T06:30:00.000Z'),
    });
    expect(result).toEqual({
      id: 'booking-1',
      roomId: 'room-1',
      title: 'Sprint Planning',
      startAt: '2026-06-01T06:00:00.000Z',
      endAt: '2026-06-01T06:30:00.000Z',
      authorName: 'Ivan Test',
      isOwnBooking: true,
      seriesId: null,
    });
  });

  describe('slot alignment', () => {
    it('rejects a start time off the 30-minute grid', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:15:00.000Z', endAt: '2026-06-01T06:45:00.000Z' }),
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an end time off the 30-minute grid', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T06:40:00.000Z' }),
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('duration bounds', () => {
    it('accepts the minimum (30 min) and maximum (4h) durations', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T06:30:00.000Z' }),
          REQUESTER,
        ),
      ).resolves.toBeDefined();

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T10:00:00.000Z' }),
          REQUESTER,
        ),
      ).resolves.toBeDefined();
    });

    it('rejects a duration below 30 minutes', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T06:15:00.000Z' }),
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a duration above 4 hours', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T10:01:00.000Z' }),
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
