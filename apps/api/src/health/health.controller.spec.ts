import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

function buildController(queryRaw: jest.Mock) {
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
  return new HealthController(prisma);
}

describe('HealthController', () => {
  it('reports ok status with an ISO timestamp when the database is reachable', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = buildController(queryRaw);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('reports 503 instead of a generic 200 when the database is unreachable', async () => {
    const queryRaw = jest.fn().mockRejectedValue(new Error('connection refused'));
    const controller = buildController(queryRaw);

    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
