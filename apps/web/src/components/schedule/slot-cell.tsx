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

export function SlotCell({ isPast, isSelected, onSelect, label, currentTimeFraction }: SlotCellProps) {
  return (
    <td className="relative border-b border-border p-0">
      {isPast ? (
        <div aria-hidden="true" className="h-full min-h-8 w-full bg-canvas/70" />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Select ${label}`}
          aria-pressed={isSelected}
          className={cn(
            'h-full min-h-8 w-full transition-colors hover:bg-accent-tint/60',
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
