import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ScheduleQueryDto {
  @IsUUID()
  roomId!: string;

  // Any instant inside the desired office week; defaults to "now" when
  // omitted. Only the week it falls in matters -- see
  // getOfficeWeekBoundaries in packages/shared.
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'referenceDate must be a valid ISO-8601 date-time' })
  referenceDate?: string;
}
