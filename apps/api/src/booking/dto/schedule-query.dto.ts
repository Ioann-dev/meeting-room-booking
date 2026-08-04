import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';
import { ISO_INSTANT_PATTERN } from 'shared';

export class ScheduleQueryDto {
  @IsUUID()
  roomId!: string;

  // Any instant inside the desired office week; defaults to "now" when
  // omitted. Only the week it falls in matters -- see
  // getOfficeWeekBoundaries in packages/shared. Same explicit-offset
  // requirement as CreateBookingDto's startAt/endAt, for the same reason.
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'referenceDate must be a valid ISO-8601 date-time' })
  @Matches(ISO_INSTANT_PATTERN, {
    message: 'referenceDate must be an ISO-8601 date-time with an explicit UTC offset or "Z"',
  })
  referenceDate?: string;
}
