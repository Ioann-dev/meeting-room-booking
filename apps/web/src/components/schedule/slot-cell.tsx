'use client';

import { cn } from '@/lib/cn';

interface SlotCellProps {
  isPast: boolean;
  isSelected: boolean;
  onSelect?: () => void;
  label: string;
  /** 0-1 fraction of this row's height where the current-time line falls, if it does. */
  currentTimeFraction?: number;
}

export function SlotCell({
  isPast,
  isSelected,
  onSelect,
  label,
  currentTimeFraction,
}: SlotCellProps) {
  return (
    <td className="relative border-b border-border p-0">
      {isPast ? (
        // bg-border (not canvas): canvas and surface differ by only a few
        // RGB points in this palette, so a canvas-tinted overlay read as
        // barely-there against the surrounding surface. border is the same
        // neutral gray already used for every grid line, just applied here
        // as a soft wash instead of a hairline -- a clearer "unavailable"
        // read without introducing a new color or texture.
        <div aria-hidden="true" className="h-full min-h-11 w-full bg-border/50 md:min-h-8" />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Select ${label}`}
          aria-pressed={isSelected}
          className={cn(
            // `block`: a bare <button> defaults to inline-block, which adds a
            // baseline-alignment gap inside a table cell (the browser reserves
            // space for the surrounding line box) -- that gap alone was already
            // pushing every row past its intended 32px/44px unit, before any
            // booking content was involved. See BookingBlock for the matching
            // fix plus the actual content-driven height cap.
            'block h-full min-h-11 w-full transition-colors hover:bg-accent-tint/60 md:min-h-8',
            isSelected && 'bg-accent-tint ring-1 ring-inset ring-accent',
          )}
        />
      )}
      {currentTimeFraction !== undefined && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t-2 border-accent-strong"
          style={{ top: `${currentTimeFraction * 100}%` }}
        />
      )}
    </td>
  );
}
