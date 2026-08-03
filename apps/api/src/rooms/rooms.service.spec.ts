import { NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

function buildService(overrides: { findMany?: jest.Mock; findUnique?: jest.Mock }) {
  const prisma = {
    room: {
      findMany: overrides.findMany ?? jest.fn(),
      findUnique: overrides.findUnique ?? jest.fn(),
    },
  } as unknown as PrismaService;
  return new RoomsService(prisma);
}

describe('RoomsService', () => {
  describe('list', () => {
    it('queries without a capacity filter when none is given', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = buildService({ findMany });

      await service.list(undefined);

      expect(findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, floor: true, capacity: true },
      });
    });

    it('filters by minimum capacity when given', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = buildService({ findMany });

      await service.list(8);

      expect(findMany).toHaveBeenCalledWith({
        where: { capacity: { gte: 8 } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, floor: true, capacity: true },
      });
    });
  });

  describe('findById', () => {
    it('returns the room when found', async () => {
      const room = { id: 'room-1', name: 'Athens', floor: 1, capacity: 4 };
      const findUnique = jest.fn().mockResolvedValue(room);
      const service = buildService({ findUnique });

      await expect(service.findById('room-1')).resolves.toEqual(room);
    });

    it('throws NotFoundException when no room matches', async () => {
      const findUnique = jest.fn().mockResolvedValue(null);
      const service = buildService({ findUnique });

      await expect(service.findById('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
