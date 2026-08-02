import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from 'shared';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
