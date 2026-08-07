'use client';

import { useEffect, useRef, useState } from 'react';
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

  // Below `sm:` (see the day <th> width classes further down), each day
  // column is resized to roughly one viewport-width "page" and the day
  // columns table becomes a horizontally-swipeable single-day view; these
  // three pieces of state/refs are purely that mobile mode's bookkeeping
  // and have no effect at `sm:` and above, where all 7 columns render at
  // their existing fixed width with no scroll tracking needed.
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const dayHeaderRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(todayDayIndex ?? 0);

  // Measures the scroll wrapper's own available width (accounting for
  // every ancestor's real padding, unlike a hand-derived `vw` calc that
  // could silently drift if the page shell's own padding ever changes)
  // and exposes it as a CSS custom property each mobile day <th> reads --
  // an imperative style mutation, not React state, since this only ever
  // drives layout and would otherwise re-render on every resize tick.
  useEffect(() => {
    const wrapper = dayScrollRef.current;
    if (!wrapper) {
      return;
    }
    // Set an accurate width synchronously as soon as this effect runs:
    // ResizeObserver's own first callback fires asynchronously (a frame
    // later), and the scroll-to-today effect below runs in the same
    // commit right after this one -- without a synchronous initial value
    // here, it would compute scroll offsets against the 20rem CSS
    // fallback instead of the real width, landing one column off
    // whenever the real width differs from that fallback.
    wrapper.style.setProperty('--day-col-width', `${wrapper.getBoundingClientRect().width}px`);
    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        wrapper.style.setProperty('--day-col-width', `${width}px`);
      }
    });
    resizeObserver.observe(wrapper);
    return () => resizeObserver.disconnect();
  }, []);

  // Keeps the active day chip in sync with whichever day column is
  // actually scrolled into view -- bidirectional with scrollToDay below,
  // which drives scroll position the other way. Day <th> elements keep a
  // stable identity across week navigation (stable index keys), so this
  // only needs to run once.
  useEffect(() => {
    const wrapper = dayScrollRef.current;
    if (!wrapper) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const index = dayHeaderRefs.current.indexOf(entry.target as HTMLTableCellElement);
          if (index === -1) {
            continue;
          }
          if (entry.intersectionRatio > (best?.ratio ?? 0)) {
            best = { index, ratio: entry.intersectionRatio };
          }
        }
        if (best && best.ratio > 0) {
          setActiveDayIndex(best.index);
        }
      },
      { root: wrapper, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const el of dayHeaderRefs.current) {
      if (el) {
        observer.observe(el);
      }
    }
    return () => observer.disconnect();
  }, []);

  // Jumps to today's column (or Monday) whenever the displayed week
  // changes -- otherwise switching weeks while scrolled to e.g. Friday
  // would silently carry that scroll position into the new week. Also
  // covers the initial mount, since `now` (and so `todayDayIndex`) only
  // resolves client-side a tick after first render -- see the schedule
  // page. A plain imperative scroll, not a state update: the
  // IntersectionObserver above picks up the resulting active day itself.
  useEffect(() => {
    const wrapper = dayScrollRef.current;
    const target = dayHeaderRefs.current[todayDayIndex ?? 0];
    if (wrapper && target) {
      wrapper.scrollTo({ left: target.offsetLeft, behavior: 'auto' });
    }
  }, [schedule.weekStartUtc, todayDayIndex]);

  function scrollToDay(index: number) {
    const wrapper = dayScrollRef.current;
    const target = dayHeaderRefs.current[index];
    if (wrapper && target) {
      wrapper.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
    }
  }

  function bookingClockLabel(instant: string): string {
    const parts = toZonedParts(instant, displayZone);
    return formatClock(parts.hour, parts.minute);
  }

  // The time rail's primary label is always office-local (the grid's rows
  // are Kyiv slot boundaries, per getBookingPosition), but booking blocks
  // display their own time in the viewer's zone -- so without a second
  // label here, a block reading "08:00" sitting in the row labeled "09:00"
  // would look like a mismatch instead of the same instant in two zones.
  //
  // A single shared rail column can only ever show *one* viewer-local value
  // per row, but the same Kyiv wall-clock slot can map to different viewer
  // offsets on different days of the displayed week -- most commonly the
  // viewer's own zone changing DST mid-week while Kyiv does not (or vice
  // versa). Showing one day's conversion as if it applied to every column
  // would misrepresent the other days, so each row's secondary label is
  // only shown when every day in the displayed week resolves to the same
  // viewer-local wall time for that Kyiv slot; otherwise the row falls back
  // to Kyiv-only, and each booking block's own per-instant label (always
  // computed from its own real start/end, never this rail) remains the
  // correct source of truth for that day.
  function railBrowserLabel(hour: number, minute: number): string | null {
    if (displayZone === OFFICE_TIMEZONE) {
      return null;
    }
    const converted = days.map((day) =>
      toZonedParts(
        zonedWallTimeToUtc(
          { year: day.year, month: day.month, day: day.day, hour, minute },
          OFFICE_TIMEZONE,
        ),
        displayZone,
      ),
    );
    const [first, ...rest] = converted;
    const uniform = rest.every(
      (parts) => parts.hour === first!.hour && parts.minute === first!.minute,
    );
    return uniform ? formatClock(first!.hour, first!.minute) : null;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Day chips: mobile-only (sm:hidden) shortcut list, not a tablist --
          a plain row of buttons in normal tab order. Tapping one scrolls
          the day-columns table to that day; the currently-intersecting
          column (tracked above) is marked both visually (fill + weight,
          never color alone) and via aria-current so the "clear active
          day" requirement holds for assistive tech too. */}
      <div role="group" aria-label="Select day" className="flex gap-1.5 overflow-x-auto sm:hidden">
        {days.map((day, dayIndex) => {
          const isActive = dayIndex === activeDayIndex;
          const isToday = dayIndex === todayDayIndex;
          return (
            <button
              key={dayIndex}
              type="button"
              onClick={() => scrollToDay(dayIndex)}
              aria-current={isActive ? 'date' : undefined}
              className={cn(
                'flex min-h-11 min-w-11 flex-col items-center justify-center rounded-md px-2.5 py-1.5 transition-colors',
                isActive
                  ? 'bg-accent font-semibold text-white'
                  : 'bg-canvas font-medium text-ink-muted hover:bg-border/40',
              )}
            >
              <span className="text-[10px] uppercase leading-none tracking-wide">
                {WEEKDAY_LABELS[day.weekday - 1]}
              </span>
              <span className="tabular-nums mt-0.5 text-sm leading-none">{day.day}</span>
              {isToday && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1 h-1 w-1 rounded-full',
                    isActive ? 'bg-white' : 'bg-accent-strong',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* A bounded max-height is what makes overflow-y actually scroll *inside*
        this box instead of the whole page -- without it, the box only ever
        grows to fit its content and the sticky day header/time rail never
        engage, since there is nothing for them to stay pinned against.
        //
        The Kyiv rail lives in its own table, entirely outside the
        horizontally-scrolling day-columns table, rather than as a
        `position: sticky; left: 0` table cell inside one shared table.
        Chromium has a real, reproducible bug where a sticky <th>/<td>'s
        background does not reliably paint over a horizontally-scrolled
        sibling cell's text -- confirmed here by testing an identical
        isolated non-table sticky <div> (no bleed) against the sticky <th>
        (bleeds, immune to isolation/clip-path/contain/z-index/GPU-layer
        promotion). Taking the rail out of the horizontally-scrolled table
        sidesteps the bug by construction: it never needs `left` stickiness
        at all, since only the day-columns table (in the nested overflow-x
        wrapper below) scrolls horizontally. Vertical `top` stickiness on
        table cells is unaffected by this bug and is unchanged here -- and
        since the rail table sits outside that wrapper, it stays visible
        throughout the mobile single-day horizontal scroll too, with no
        separate handling needed.
        //
        Both tables share the exact same per-row height unit (min-h-11/
        max-h-11 md:min-h-8/md:max-h-8, the same constants BookingBlock and
        SlotCell use) so their rows independently compute to identical
        heights without needing to be the same physical table. */}
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
                {officeSlots.map((slot) => {
                  const browserLabel = railBrowserLabel(slot.hour, slot.minute);
                  return (
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
                          {browserLabel !== null && (
                            <span className="tabular-nums block text-[10px] leading-none text-ink-faint">
                              {browserLabel}
                            </span>
                          )}
                        </div>
                      </th>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* relative: without it, a day <th>'s offsetLeft (read by
            scrollToDay and the scroll-to-today effect above) resolves
            against the nearest positioned ancestor -- which, absent this,
            is <body> -- rather than against this wrapper's own scrolled
            content origin, silently biasing every computed scroll target
            by this wrapper's own offset from the page edge. */}
          <div
            ref={dayScrollRef}
            className="relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
          >
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
                      ref={(el) => {
                        dayHeaderRefs.current[dayIndex] = el;
                      }}
                      scope="col"
                      className={cn(
                        // Below sm: each column is resized to ~one viewport
                        // width (via the ResizeObserver-driven custom
                        // property above) so the day-columns table becomes
                        // a horizontally-swipeable single-day view; at sm:
                        // and above this reverts to the existing fixed
                        // narrow-column desktop density unchanged.
                        'sticky top-0 z-10 w-[var(--day-col-width,20rem)] min-w-[var(--day-col-width,20rem)] border-b border-border bg-surface p-2 text-left align-top sm:w-auto sm:min-w-[6.5rem]',
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
    </div>
  );
}
