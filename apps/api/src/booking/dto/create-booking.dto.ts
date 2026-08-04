import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BOOKING_TITLE_MAX_LENGTH,
  BOOKING_TITLE_MIN_LENGTH,
  ISO_INSTANT_PATTERN,
  RECURRENCE_MAX_OCCURRENCES,
  RECURRENCE_MIN_OCCURRENCES,
} from 'shared';
import { trimStringValue } from '../../auth/trim.transform';

const INSTANT_FORMAT_MESSAGE =
  'must be an ISO-8601 date-time with an explicit UTC offset or "Z" (e.g. 2026-06-01T09:00:00.000Z)';

// The weekday and time-of-day come from startAt/endAt themselves (e.g.
// "every Tuesday 09:00-09:30" is implied by a Tuesday 09:00-09:30 startAt/
// endAt) -- occurrenceCount is the only additional input recurrence needs.
export class RecurrenceInputDto {
  @IsInt()
  @Min(RECURRENCE_MIN_OCCURRENCES, {
    message: `occurrenceCount must be at least ${RECURRENCE_MIN_OCCURRENCES}`,
  })
  @Max(RECURRENCE_MAX_OCCURRENCES, {
    message: `occurrenceCount must be at most ${RECURRENCE_MAX_OCCURRENCES}`,
  })
  occurrenceCount!: number;
}

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

  // Absent: a single booking (Phase 05 behavior, unchanged). Present: a
  // weekly recurring series anchored at startAt/endAt (Phase 06).
  //
  // @IsObject() matters beyond a friendlier error: class-validator's
  // @ValidateNested() treats an array as a collection and validates each
  // element, so `recurrence: []` and `recurrence: [{ occurrenceCount: 3 }]`
  // both passed validation with zero errors before this was added --
  // `dto.recurrence` ended up as a truthy array, the controller routed to
  // createSeries(), and `recurrence.occurrenceCount` (undefined on an
  // array) reached generateWeeklyOccurrences() as `undefined`, producing
  // zero occurrences and an unhandled 500 on `occurrences[0]`. @IsObject()
  // explicitly excludes arrays (and null), so both shapes are now a clean
  // 400 at the DTO boundary instead of reaching the service at all.
  @IsOptional()
  @IsObject({ message: 'recurrence must be an object, not an array or primitive' })
  @ValidateNested()
  @Type(() => RecurrenceInputDto)
  recurrence?: RecurrenceInputDto;
}
