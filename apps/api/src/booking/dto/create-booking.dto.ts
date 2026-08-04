import { Transform } from 'class-transformer';
import { IsISO8601, IsString, IsUUID, Length, Matches } from 'class-validator';
import { BOOKING_TITLE_MAX_LENGTH, BOOKING_TITLE_MIN_LENGTH, ISO_INSTANT_PATTERN } from 'shared';
import { trimStringValue } from '../../auth/trim.transform';

const INSTANT_FORMAT_MESSAGE =
  'must be an ISO-8601 date-time with an explicit UTC offset or "Z" (e.g. 2026-06-01T09:00:00.000Z)';

export class CreateBookingDto {
  @Transform(trimStringValue)
  @IsString()
  @Length(BOOKING_TITLE_MIN_LENGTH, BOOKING_TITLE_MAX_LENGTH, {
    message: `Title must be between ${BOOKING_TITLE_MIN_LENGTH} and ${BOOKING_TITLE_MAX_LENGTH} characters`,
  })
  title!: string;

  @IsUUID()
  roomId!: string;

  // Two checks, not one: @IsISO8601 gives a friendly rejection for
  // obviously-malformed input, and @Matches(ISO_INSTANT_PATTERN) rejects
  // the narrower set of ISO-8601 shapes that are valid but ambiguous
  // (offset-less, basic format, week-dates) -- see the comment on
  // ISO_INSTANT_PATTERN in packages/shared/src/time.ts. Parsed into a UTC
  // instant via the shared parseIsoInstant helper before persistence.
  @IsISO8601({ strict: true }, { message: 'startAt must be a valid ISO-8601 date-time' })
  @Matches(ISO_INSTANT_PATTERN, { message: `startAt ${INSTANT_FORMAT_MESSAGE}` })
  startAt!: string;

  @IsISO8601({ strict: true }, { message: 'endAt must be a valid ISO-8601 date-time' })
  @Matches(ISO_INSTANT_PATTERN, { message: `endAt ${INSTANT_FORMAT_MESSAGE}` })
  endAt!: string;
}
