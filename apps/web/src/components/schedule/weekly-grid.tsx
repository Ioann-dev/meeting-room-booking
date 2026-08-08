'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
import { formatDayMonth, WEEKDAY_LABELS_SHORT as WEEKDAY_LABELS } from '@/lib/format-date';
import { BookingBlock } from './booking-block';
import { buildDayColumn, type DayBooking } from './day-column';
import { SlotCell } from './slot-cell';

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

// The single canonical slot geometry every grid coordinate derives from:
// the time rail, the horizontal row lines, booking block height, the
// current-time indicator, and the Today-column tint all read these same
// three CSS custom properties (never a second, independently-computed
// value) so there is exactly one place that could ever drift, not several
// that have to agree by convention.
const GRID_VARS = {
  '--rail-w': '4.75rem',
  '--header-h': '4rem',
  '--slot-h': '2.75rem',
} as CSSProperties;

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

  // Below `sm:` (see the day-header width classes further down), each day
  // column is resized to roughly one viewport-width "page" so the grid
  // becomes a horizontally-swipeable single-day view; these three pieces of
  // state/refs are purely that mobile mode's bookkeeping and have no effect
  // at `sm:` and above, where all 7 columns render at their existing fixed
  // width with no scroll tracking needed.
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayHeaderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(todayDayIndex ?? 0);

  useEffect(() => {
    const wrapper = scrollRef.current;
    if (!wrapper) {
      return;
    }
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

  useEffect(() => {
    const wrapper = scrollRef.current;
    if (!wrapper) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const index = dayHeaderRefs.current.indexOf(entry.target as HTMLDivElement);
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

  useEffect(() => {
    const wrapper = scrollRef.current;
    const target = dayHeaderRefs.current[todayDayIndex ?? 0];
    if (wrapper && target) {
      wrapper.scrollTo({ left: target.offsetLeft, behavior: 'auto' });
    }
  }, [schedule.weekStartUtc, todayDayIndex]);

  function scrollToDay(index: number) {
    const wrapper = scrollRef.current;
    const target = dayHeaderRefs.current[index];
    if (wrapper && target) {
      wrapper.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
    }
  }

  function bookingClockLabel(instant: string): string {
    const parts = toZonedParts(instant, displayZone);
    return formatClock(parts.hour, parts.minute);
  }

  // A single shared rail column can only ever show *one* viewer-local value
  // per row, but the same Kyiv wall-clock slot can map to different viewer
  // offsets on different days of the displayed week -- most commonly the
  // viewer's own zone changing DST mid-week while Kyiv does not (or vice
  // versa). Showing one day's conversion as if it applied to every column
  // would misrepresent the other days, so the viewer-time label is only
  // shown when every day in the displayed week resolves to the same
  // viewer-local wall time for that Kyiv slot; otherwise the row falls back
  // to Kyiv-only, and each booking block's own per-instant label (always
  // computed from its own real start/end, never this rail) remains the
  // correct source of truth for that day.
  function railViewerLabel(hour: number, minute: number): string | null {
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
          the grid to that day; the currently-intersecting column (tracked
          above) is marked both visually (fill + weight, never color alone)
          and via aria-current so the "clear active day" requirement holds
          for assistive tech too. */}
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
                  ? 'bg-primary font-semibold text-white'
                  : 'bg-surface-soft font-medium text-ink-secondary hover:bg-surface-hover',
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
                    isActive ? 'bg-white' : 'bg-primary-hover',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Single scroll container, both axes -- the whole reason the rail and
          the day columns are now guaranteed to align. Sticky `top`/`left`
          items resolve their containing block against the nearest ancestor
          with non-visible overflow; with two separate scroll containers
          (one per axis) a corner cell needing both would resolve against
          two different ancestors and the math gets fragile fast. One
          container means one unambiguous answer for every sticky item, and
          drops the old two-<table> split (and its Chromium sticky-paint
          workaround, which was a table-border-collapse-specific bug that a
          plain grid item was never going to hit in the first place). */}
      <div
        ref={scrollRef}
        className="relative max-h-[70vh] overflow-auto rounded-[14px] border border-border bg-surface"
      >
        {/* This was a real <table> before; a plain grid of positioned <div>s
            has no built-in row/column semantics to replace it with, and a
            half-finished `role="grid"` (without the full row/columnheader/
            gridcell hierarchy ARIA requires under it) is an axe violation,
            not an accessibility improvement -- `aria-required-children` and
            `aria-required-parent` both fire on an incomplete grid pattern.
            `role="group"` plus a label carries the same information content
            table roles gave for free (a named region) without claiming
            interactive-grid keyboard semantics this component still doesn't
            implement; every cell keeps its own accessible name below, same
            as before. */}
        <div
          role="group"
          // "week of", not "week starting" -- Playwright's getByLabel does
          // substring matching, and "starting" collided with the booking
          // form's real "Start" field label, making getByLabel('Start')
          // ambiguous in the e2e suite.
          aria-label={`Weekly schedule for ${roomName}, week of ${formatDayMonth(days[0].month, days[0].day)} ${days[0].year}`}
          // w-max below `sm:`: the mobile single-day-scroll columns are
          // fixed px tracks (`var(--day-col-width)`) that intentionally sum
          // wider than the viewport. A block-level grid container's default
          // `width: auto` fills only the *available* (viewport) width, not
          // its own track layout -- so without `w-max` the container's own
          // box stayed viewport-width while its tracks silently overflowed
          // it, and every sticky rail cell (whose containing block is this
          // grid container) stuck relative to that too-narrow box instead
          // of the true scrolled content, breaking the rail during the
          // mobile per-day horizontal scroll. `sm:w-full` restores the
          // unchanged desktop sizing, whose `1fr` tracks never overflow.
          className="relative grid w-max grid-cols-[var(--rail-w)_repeat(7,var(--day-col-width,20rem))] bg-grid-line-soft sm:w-full sm:grid-cols-[var(--rail-w)_repeat(7,minmax(6.5rem,1fr))]"
          style={{
            ...GRID_VARS,
            gridTemplateRows: `var(--header-h) repeat(${totalRows}, var(--slot-h))`,
            gap: '1px',
          }}
        >
          {/* Corner cell: sticky on both axes, so it always sits above
              whichever day column has scrolled underneath it. */}
          <div
            // bg-surface (white), not bg-surface-soft: brightening every
            // non-today header/corner cell to white -- rather than the
            // prior uniform gray-soft wash across the whole header row --
            // both reads cleaner on its own and makes the Today header's
            // still-tinted violet the only colored cell in the row, so it
            // pops by contrast instead of blending into an already-tinted
            // strip (visual-polish pass; the border still marks the row
            // boundary, so nothing here affects grid geometry).
            className="sticky left-0 top-0 z-30 flex flex-col justify-center gap-0.5 border-b-2 border-grid-line bg-surface px-2 py-2 text-left leading-none"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink-secondary">
              Kyiv
            </span>
            {displayZone !== OFFICE_TIMEZONE && (
              <span className="text-[10px] font-medium normal-case tracking-normal text-ink-muted">
                Your time
              </span>
            )}
          </div>

          {/* Day headers: sticky top-0 only -- they scroll horizontally
              with their column, which is exactly what keeps a header lined
              up with its own body cells regardless of scroll position. */}
          {days.map((day, dayIndex) => {
            const isToday = dayIndex === todayDayIndex;
            return (
              <div
                key={dayIndex}
                ref={(el) => {
                  dayHeaderRefs.current[dayIndex] = el;
                }}
                className={cn(
                  'sticky top-0 z-20 flex flex-col justify-center border-b-2 border-grid-line px-2 py-2 text-left',
                  // Non-today headers go white (see the corner cell's
                  // comment above) so Today's violet tint is the one
                  // colored cell in the row.
                  isToday ? 'bg-today-header-bg' : 'bg-surface',
                )}
                style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
              >
                <span
                  className={cn(
                    'block text-[11px] font-semibold uppercase leading-none tracking-[0.04em]',
                    isToday ? 'text-primary-active' : 'text-ink-muted',
                  )}
                >
                  {WEEKDAY_LABELS[day.weekday - 1]}
                </span>
                <span
                  className={cn(
                    'tabular-nums mt-1 block text-sm font-bold leading-none',
                    isToday ? 'text-primary-active' : 'text-ink',
                  )}
                >
                  {formatDayMonth(day.month, day.day)}
                </span>
                {/* Always rendered (not just when this is today) and
                    deterministically positioned, so the header row's height
                    never depends on whether any day in the week is "today". */}
                <span
                  aria-hidden={!isToday}
                  className={cn(
                    'mt-1 block text-[11px] font-bold leading-none text-primary-hover',
                    isToday ? 'visible' : 'invisible',
                  )}
                >
                  Today
                </span>
              </div>
            );
          })}

          {/* Today column tint: one grid item spanning every body row of
              that column, rendered before the interactive cells so it sits
              beneath them in paint order -- an empty slot cell has no
              background of its own at rest, so the tint shows straight
              through it, while a booking's own opaque color (or a past/
              selected cell's own background) paints over it. Continuous by
              construction: it is the exact same grid column as the header
              above it and the exact same row span as the grid body, not a
              separately-measured approximation. */}
          {todayDayIndex !== null && (
            <div
              aria-hidden="true"
              className="pointer-events-none bg-today-bg"
              style={{ gridColumn: todayDayIndex + 2, gridRow: `2 / ${totalRows + 2}` }}
            />
          )}

          {/* Rail labels: sticky left-0 only -- vertical scroll carries them
              with the body rows, horizontal scroll (mobile single-day view)
              pins them to the left edge. */}
          {officeSlots.map((slot) => {
            const viewerLabel = railViewerLabel(slot.hour, slot.minute);
            const primaryLabel = viewerLabel ?? formatClock(slot.hour, slot.minute);
            const secondaryLabel =
              viewerLabel !== null ? formatClock(slot.hour, slot.minute) : null;
            return (
              <div
                key={slot.rowIndex}
                // role="group": axe's aria-prohibited-attr rule disallows
                // aria-label on a role-less <div> (no implicit ARIA
                // semantics to attach a name to) -- group is the same
                // "named region with no other semantics" role the grid and
                // day-chip containers already use.
                role="group"
                // An explicit aria-label, with the visible spans hidden from
                // the accessible tree, so a screen-reader user gets the same
                // viewer-vs-Kyiv distinction the visual bold/faint pairing
                // carries -- without it the two bare time strings would read
                // as one ambiguous run. Same technique BookingBlock uses.
                aria-label={
                  secondaryLabel !== null
                    ? `${primaryLabel} your time, ${secondaryLabel} Kyiv time`
                    : `${primaryLabel} Kyiv time`
                }
                className="sticky left-0 z-10 flex flex-col justify-center bg-surface py-0.5 pl-2 pr-2.5 text-right leading-none sm:pr-3"
                style={{ gridColumn: 1, gridRow: slot.rowIndex + 2 }}
              >
                <span
                  aria-hidden="true"
                  className="tabular-nums block text-[13px] font-bold leading-none text-[#343945]"
                >
                  {primaryLabel}
                </span>
                {secondaryLabel !== null && (
                  <span
                    aria-hidden="true"
                    // text-ink-muted (#6b7280, 4.836:1 on white), not the
                    // brief's literal #9298A6 -- #9298A6 measures 2.89:1 on
                    // this row's white background and fails WCAG AA's
                    // 4.5:1 minimum for normal-weight text this small (see
                    // globals.css's own ink-muted/warning adjustments for
                    // the same reasoning).
                    className="tabular-nums mt-0.5 block text-[10.5px] font-medium leading-none text-ink-muted"
                  >
                    {secondaryLabel}
                  </span>
                )}
              </div>
            );
          })}

          {/* Body cells: one grid item per free slot or booking (a booking
              spans `rowSpan` row-tracks via `grid-row`, absorbing the
              tracks' own 1px gaps as part of its own box automatically --
              no manual N*unit+(N-1)*1px border-compensation arithmetic
              needed, the grid algorithm's own span math is exact by
              construction). "covered" rows render nothing, same as before. */}
          {days.map((day, dayIndex) =>
            officeSlots.map((slot) => {
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
                    key={`${dayIndex}-${slot.rowIndex}`}
                    booking={cell.booking}
                    rowSpan={cell.rowSpan}
                    startLabel={bookingClockLabel(cell.booking.startAt)}
                    endLabel={bookingClockLabel(cell.booking.endAt)}
                    onSelect={onSelectBooking}
                    currentTimeFraction={fraction}
                    gridColumn={dayIndex + 2}
                    gridRowStart={cell.rowIndex + 2}
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
                  key={`${dayIndex}-${slot.rowIndex}`}
                  isPast={isPast}
                  isSelected={isSelected}
                  onSelect={isPast ? undefined : () => onSelectSlot(slotInstant)}
                  label={`${formatClock(slot.hour, slot.minute)} on ${WEEKDAY_LABELS[day.weekday - 1]} ${formatDayMonth(day.month, day.day)}`}
                  currentTimeFraction={fraction}
                  gridColumn={dayIndex + 2}
                  gridRow={slot.rowIndex + 2}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
