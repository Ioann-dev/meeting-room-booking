import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingModule } from './booking/booking.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Applied per-route (register/login, see auth.controller.ts) via
    // @UseGuards(ThrottlerGuard), not globally -- credential-guessing on
    // auth is the actual threat this exists to slow down; the read-mostly
    // schedule/booking endpoints have no comparable abuse case yet.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    RoomsModule,
    BookingModule,
    NotificationsModule,
  ],
})
export class AppModule {}
