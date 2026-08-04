import { Transform } from 'class-transformer';
import { IsISO8601, IsString, IsUUID, Length } from 'class-validator';
import { BOOKING_TITLE_MAX_LENGTH, BOOKING_TITLE_MIN_LENGTH } from 'shared';
import { trimStringValue } from '../../auth/trim.transform';

export class CreateBookingDto {
  @Transform(trimStringValue)
  @IsString()
  @Length(BOOKING_TITLE_MIN_LENGTH, BOOKING_TITLE_MAX_LENGTH, {
    message: `Title must be between ${BOOKING_TITLE_MIN_LENGTH} and ${BOOKING_TITLE_MAX_LENGTH} characters`,
  })
  title!: string;

  @IsUUID()
  roomId!: string;

  // Accepted as an ISO-8601 instant (offset or "Z" expected); parsed
  // straight into a UTC instant before persistence -- see
  // docs/architecture.md's UTC storage strategy.
  @IsISO8601({ strict: true }, { message: 'startAt must be a valid ISO-8601 date-time' })
  startAt!: string;

  @IsISO8601({ strict: true }, { message: 'endAt must be a valid ISO-8601 date-time' })
  endAt!: string;
}
