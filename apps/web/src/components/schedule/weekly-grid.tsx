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
  onSelectBooking: (booking: BookingSummary, trigger: HTMLButtonElement) => void;
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
  const currentTimePosition =
    now !== null ? getCurrentTimePosition(now, schedule.weekStartUtc) : null;

  function bookingClockLabel(instant: string): string {
    const parts = toZonedParts(instant, displayZone);
    return formatClock(parts.hour, parts.minute);
  }

  // The time rail's primary label is always office-local (the grid's rows
  // are Kyiv slot boundaries, per getBookingPosition), but booking blocks
  // display their own time in the viewer's zone -- so without a second
  // label here, a block reading "08:00" sitting in the row labeled "09:00"
  // would look like a mismatch instead of the same instant in two zones.
  // Derived from the week's Monday: correct for every realistic viewer zone,
  // and at worst (a same-week DST shift, or an offset large enough to cross
  // a calendar day) only this secondary label could drift by the shift
  // amount -- the row's Kyiv identity and every booking's own displayed
  // time are unaffected either way.
  const showRailBrowserLabel = displayZone !== OFFICE_TIMEZONE;
  function railBrowserLabel(hour: number, minute: number): string | null {
    if (!showRailBrowserLabel) {
      return null;
    }
    const instant = zonedWallTimeToUtc(
      { year: days[0].year, month: days[0].month, day: days[0].day, hour, minute },
      OFFICE_TIMEZONE,
    );
    const parts = toZonedParts(instant, displayZone);
    return formatClock(parts.hour, parts.minute);
  }

  return (
    // A bounded max-height is what makes overflow-y actually scroll *inside*
    // this box instead of the whole page -- without it, the box only ever
    // grows to fit its content and the sticky day header/time rail never
    // engage, since there is nothing for them to stay pinned against.
    //
    // The Kyiv rail lives in its own table, entirely outside the
    // horizontally-scrolling day-columns table, rather than as a
    // `position: sticky; left: 0` table cell inside one shared table.
    // Chromium has a real, reproducible bug where a sticky <th>/<td>'s
    // background does not reliably paint over a horizontally-scrolled
    // sibling cell's text -- confirmed here by testing an identical
    // isolated non-table sticky <div> (no bleed) against the sticky <th>
    // (bleeds, immune to isolation/clip-path/contain/z-index/GPU-layer
    // promotion). Taking the rail out of the horizontally-scrolled table
    // sidesteps the bug by construction: it never needs `left` stickiness
    // at all, since only the day-columns table (in the nested overflow-x
    // wrapper below) scrolls horizontally. Vertical `top` stickiness on
    // table cells is unaffected by this bug and is unchanged here.
    //
    // Both tables share the exact same per-row height unit (min-h-11/
    // max-h-11 md:min-h-8/md:max-h-8, the same constants BookingBlock and
    // SlotCell use) so their rows independently compute to identical
    // heights without needing to be the same physical table.
    <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-surface">
      {/* items-start: without it, flexbox's default align-items:stretch
          forces both tables to the height of the taller one, and a
          <table> stretched taller than its own content redistributes that
          extra space across its rows -- exactly the kind of row-height
          drift the two-table split must not introduce. Each table should
          only ever be as tall as its own 20 rows independently compute to. */}
      <div className="flex items-start">
        {/* overflow-x-auto overflow-y-hidden here (never actually
            scrollable, since this table's own width is fixed) matches the
            day-columns wrapper's overflow declaration below. Verified
            live: without it, this table's sticky <th> top-0 elements do
            not track vertical scroll of the outer container at all (they
            stay glued to their unscrolled position); with a matching
            wrapper, both tables' sticky headers resolve their "nearest
            scrolling ancestor" the same way and move in lockstep. */}
        <div className="flex-none overflow-x-auto overflow-y-hidden">
          <table className="w-16 border-collapse text-sm">
            <caption className="sr-only">Kyiv office-hours time reference</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-16 border-b border-r border-border bg-surface p-0 text-left text-[11px] font-medium uppercase tracking-wide text-ink-subtle"
                >
                  {/* min-h-14 matches the day-header table's own header row height
                    exactly: p-2 (1rem vertical) + 3 leading-none text lines
                    (11px + 14px + 11px) + 2 half-unit gaps (2px + 2px) = 56px =
                    3.5rem. That table reserves space for its "Today" badge line
                    on every header regardless of whether any day is today, so
                    its header height is the same deterministic constant here
                    rather than something that would need runtime measurement
                    to track. */}
                  <div className="flex min-h-14 items-center p-2">Kyiv</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {officeSlots.map((slot) => (
                <tr key={slot.rowIndex}>
                  <th
                    scope="row"
                    className="sticky top-0 z-10 border-b border-r border-border bg-surface p-0 text-right text-xs font-normal text-ink-subtle"
                  >
                    {/* min-h/max-h live on this inner div, not the <th> itself:
                      table cells don't reliably honor min-height/max-height
                      as a row-sizing floor when there's no sibling cell (a
                      normal, non-table-cell element like this one) also
                      demanding that height -- alone in this single-column
                      table, a height constraint on the <th> directly was
                      silently ignored by the row-sizing algorithm. A plain
                      block child's min-height is honored reliably, and that
                      then drives the <th>'s (and so the row's) natural
                      height the same way SlotCell/BookingBlock's own inner
                      button already does. */}
                    <div className="flex min-h-11 max-h-11 flex-col justify-center px-2 py-0.5 md:min-h-8 md:max-h-8">
                      <span className="tabular-nums block leading-none">
                        {formatClock(slot.hour, slot.minute)}
                      </span>
                      {showRailBrowserLabel && (
                        <span className="tabular-nums block text-[10px] leading-none text-ink-faint">
                          {railBrowserLabel(slot.hour, slot.minute)}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <table className="w-full min-w-[42rem] table-fixed border-collapse text-sm">
            <caption className="sr-only">
              Weekly schedule for {roomName}, week starting {days[0].month}/{days[0].day}/
              {days[0].year}
            </caption>
            <thead>
              <tr>
                {days.map((day, dayIndex) => (
                  <th
                    key={dayIndex}
                    scope="col"
                    className={cn(
                      'sticky top-0 z-10 min-w-[6.5rem] border-b border-border bg-surface p-2 text-left align-top',
                      dayIndex === todayDayIndex && 'bg-accent-tint/60',
                    )}
                  >
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-subtle leading-none">
                      {WEEKDAY_LABELS[day.weekday - 1]}
                    </span>
                    <span className="tabular-nums mt-0.5 block text-sm font-semibold leading-none text-ink">
                      {day.month}/{day.day}
                    </span>
                    {/* Always rendered (not just when this is today) and
                        deterministically leading-none/mt-0.5, so this row's
                        height never depends on whether any day in the week
                        is "today" -- the rail table's header (min-h-14)
                        matches that same fixed height without needing to
                        measure this table at runtime. */}
                    <span
                      aria-hidden={dayIndex !== todayDayIndex}
                      className={cn(
                        'mt-0.5 block text-[11px] font-medium leading-none text-accent-strong',
                        dayIndex === todayDayIndex ? 'visible' : 'invisible',
                      )}
                    >
                      Today
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {officeSlots.map((slot) => (
                <tr key={slot.rowIndex}>
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
                      {
                        year: day.year,
                        month: day.month,
                        day: day.day,
                        hour: slot.hour,
                        minute: slot.minute,
                      },
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
      </div>
    </div>
  );
}
