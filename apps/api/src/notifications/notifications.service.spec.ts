import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

function buildService(findMany: jest.Mock) {
  const prisma = { booking: { findMany } } as unknown as PrismaService;
  const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
  return new NotificationsService(prisma, config);
}

describe('NotificationsService', () => {
  describe('runEndingSoonCheck', () => {
    it('logs and resolves instead of throwing when the database is unavailable', async () => {
      const findMany = jest.fn().mockRejectedValue(new Error('connection refused'));
      const service = buildService(findMany);

      await expect(service.runEndingSoonCheck()).resolves.toBeUndefined();
    });

    it('does nothing when no booking is ending within the notify window', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = buildService(findMany);

      await expect(service.runEndingSoonCheck()).resolves.toBeUndefined();
      expect(findMany).toHaveBeenCalledTimes(1);
    });
  });
});
