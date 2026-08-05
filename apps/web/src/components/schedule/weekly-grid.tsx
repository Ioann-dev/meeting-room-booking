'use client';

import {
  getBookingPosition,
  getCurrentTimePosition,
  getOfficeSlots,
  getOfficeWeekDays,
  getTodayDayIndex,
  OFFICE_TIMEZONE,
  toZonedParts,
  zonedWallTimeToUtc,
  type BookingSummary,
  type RoomScheduleResponse,
} from 'shared';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/format-clock';
import { BookingBlock } from './booking-block';
import { buildDayColumn, type DayBooking } from './day-column';
import { SlotCell } from './slot-cell';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface WeeklyGridProps {
  roomName: string;
  schedule: RoomScheduleResponse;
  userTimeZone: string | null;
  /** UTC ISO instant of the currently-selected free slot's start, or null. */
  selectedSlotStart: string | null;
  onSelectSlot: (isoInstant: string) => void;
  onSelectBooking: (booking: BookingSummary) => void;
  /** UTC ISO instant for "now", resolved client-side only (see the schedule page). */
  now: string | null;
}

export function WeeklyGrid({
  roomName,
  schedule,
  userTimeZone,
  selectedSlotStart,
  onSelectSlot,
  onSelectBooking,
  now,
}: WeeklyGridProps) {
  const days = getOfficeWeekDays(schedule.weekStartUtc);
  const officeSlots = getOfficeSlots();
  const totalRows = officeSlots.length;
  const displayZone = userTimeZone ?? OFFICE_TIMEZONE;

  const bookingsByDay: DayBooking[][] = Array.from({ length: 7 }, () => []);
  for (const booking of schedule.bookings) {
    const position = getBookingPosition(booking.startAt, booking.endAt, schedule.weekStartUtc);
    if (!position) {
      continue;
    }
    bookingsByDay[position.dayIndex]!.push({
      booking,
      rowStart: position.rowStart,
      rowSpan: position.rowSpan,
    });
  }
  const dayColumns = bookingsByDay.map((dayBookings) => buildDayColumn(dayBookings, totalRows));

  const todayDayIndex = now !== null ? getTodayDayIndex(now, schedule.weekStartUtc) : null;
  const currentTimePosition = now !== null ? getCurrentTimePosition(now, schedule.weekStartUtc) : null;

  function bookingClockLabel(instant: string): string {
    const parts = toZonedParts(instant, displayZone);
    return formatClock(parts.hour, parts.minute);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <caption className="sr-only">
          Weekly schedule for {roomName}, week starting {days[0].month}/{days[0].day}/{days[0].year}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 top-0 z-20 w-16 border-b border-r border-border bg-surface p-2 text-left text-[11px] font-medium uppercase tracking-wide text-ink-subtle"
            >
              Time
            </th>
            {days.map((day, dayIndex) => (
              <th
                key={dayIndex}
                scope="col"
                className={cn(
                  'sticky top-0 z-10 min-w-[6.5rem] border-b border-border bg-surface p-2 text-left align-top',
                  dayIndex === todayDayIndex && 'bg-accent-tint/60',
                )}
              >
                <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                  {WEEKDAY_LABELS[day.weekday - 1]}
                </span>
                <span className="tabular-nums block text-sm font-semibold text-ink">
                  {day.month}/{day.day}
                </span>
                {dayIndex === todayDayIndex && (
                  <span className="block text-[11px] font-medium text-accent-strong">Today</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {officeSlots.map((slot) => (
            <tr key={slot.rowIndex}>
              <th
                scope="row"
                className="tabular-nums sticky left-0 z-10 border-b border-r border-border bg-surface px-2 py-1 text-right text-xs font-normal text-ink-subtle"
              >
                {formatClock(slot.hour, slot.minute)}
              </th>
              {days.map((day, dayIndex) => {
                const cell = dayColumns[dayIndex]![slot.rowIndex]!;
                if (cell.kind === 'covered') {
                  return null;
                }

                const isCurrentDay =
                  currentTimePosition !== null && currentTimePosition.dayIndex === dayIndex;

                if (cell.kind === 'booking') {
                  const fraction =
                    isCurrentDay &&
                    currentTimePosition.rowOffset >= cell.rowIndex &&
                    currentTimePosition.rowOffset < cell.rowIndex + cell.rowSpan
                      ? (currentTimePosition.rowOffset - cell.rowIndex) / cell.rowSpan
                      : undefined;

                  return (
                    <BookingBlock
                      key={dayIndex}
                      booking={cell.booking}
                      rowSpan={cell.rowSpan}
                      startLabel={bookingClockLabel(cell.booking.startAt)}
                      endLabel={bookingClockLabel(cell.booking.endAt)}
                      onSelect={onSelectBooking}
                      currentTimeFraction={fraction}
                    />
                  );
                }

                const slotInstant = zonedWallTimeToUtc(
                  { year: day.year, month: day.month, day: day.day, hour: slot.hour, minute: slot.minute },
                  OFFICE_TIMEZONE,
                );
                const isPast = now !== null && slotInstant < now;
                const isSelected = selectedSlotStart === slotInstant;
                const fraction =
                  isCurrentDay && Math.floor(currentTimePosition.rowOffset) === cell.rowIndex
                    ? currentTimePosition.rowOffset - cell.rowIndex
                    : undefined;

                return (
                  <SlotCell
                    key={dayIndex}
                    isPast={isPast}
                    isSelected={isSelected}
                    onSelect={isPast ? undefined : () => onSelectSlot(slotInstant)}
                    label={`${formatClock(slot.hour, slot.minute)} on ${WEEKDAY_LABELS[day.weekday - 1]} ${day.month}/${day.day}`}
                    currentTimeFraction={fraction}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
