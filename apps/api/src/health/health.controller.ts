import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { HealthStatus } from 'shared';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    // A cheap connectivity ping, not a full readiness probe: this is what
    // makes the container healthcheck (docker-compose.yml) actually mean
    // something once Postgres becomes unreachable after startup, rather
    // than only ever reflecting whether the Node process itself is alive.
    // The success-path response shape is unchanged either way -- only the
    // failure path (503, no plaintext DB error in the body) is new.
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
