import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MY_BOOKINGS_PAST_PAGE_SIZE } from 'shared';

export type MyBookingsScope = 'upcoming' | 'past';

export class MyBookingsQueryDto {
  @IsIn(['upcoming', 'past'])
  scope!: MyBookingsScope;

  // Ignored for scope=upcoming; validated as an opaque string here, decoded
  // (and rejected if malformed) by BookingService.listMinePast.
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = MY_BOOKINGS_PAST_PAGE_SIZE;
}
