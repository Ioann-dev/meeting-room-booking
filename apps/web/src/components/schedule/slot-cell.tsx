'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { CurrentTimeMark } from './current-time-mark';

interface SlotCellProps {
  isPast: boolean;
  isSelected: boolean;
  onSelect?: () => void;
  label: string;
  /** 0-1 fraction of this row's height where the current-time line falls, if it does. */
  currentTimeFraction?: number;
  gridColumn: number;
  gridRow: number;
}

export function SlotCell({
  isPast,
  isSelected,
  onSelect,
  label,
  currentTimeFraction,
  gridColumn,
  gridRow,
}: SlotCellProps) {
  const position: CSSProperties = { gridColumn, gridRow };

  if (isPast) {
    // A plain wash, not a button: past slots aren't selectable. bg-surface-
    // soft (not a stronger gray) so it reads as quietly unavailable without
    // fighting the far more important colored booking blocks and the
    // Today-column tint for attention -- both of those still need to read
    // as the most prominent things on the grid.
    return (
      <div aria-hidden="true" className="relative bg-surface-soft" style={position}>
        {currentTimeFraction !== undefined && <CurrentTimeMark fraction={currentTimeFraction} />}
      </div>
    );
  }

  return (
    <div className="relative bg-surface" style={position}>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Select ${label}`}
        aria-pressed={isSelected}
        className={cn(
          'block h-full w-full transition-colors duration-150 ease-premium',
          isSelected
            ? 'bg-primary-soft ring-1 ring-inset ring-primary'
            : 'hover:bg-primary-soft/60 hover:ring-1 hover:ring-inset hover:ring-primary/30',
        )}
      />
      {currentTimeFraction !== undefined && <CurrentTimeMark fraction={currentTimeFraction} />}
    </div>
  );
}
