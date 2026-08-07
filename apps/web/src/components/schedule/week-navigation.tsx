'use client';

import { getOfficeWeekDays } from 'shared';
import { Button } from '@/components/ui/button';
import { formatWeekRangeLabel } from '@/lib/format-date';

interface WeekNavigationProps {
  weekStartUtc: string;
  isCurrentWeek: boolean;
  onNavigate: (direction: 'previous' | 'next' | 'current') => void;
}

export function WeekNavigation({ weekStartUtc, isCurrentWeek, onNavigate }: WeekNavigationProps) {
  const [first, , , , , , last] = getOfficeWeekDays(weekStartUtc);
  const rangeLabel = formatWeekRangeLabel(first, last);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-ink">{rangeLabel}</p>
        <p className="text-xs text-ink-subtle">Office hours, Europe/Kyiv</p>
      </div>
      {/* A single bordered "track" with ghost-variant segments reads as one
          connected navigation control rather than three floating chips --
          ghost carries no border/rounded of its own, so nesting it inside
          this frame is purely additive, never a same-property class fight. */}
      <div className="inline-flex items-center gap-1 rounded-md border border-border bg-canvas p-1">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onNavigate('previous')}
          aria-label="Previous week"
          className="px-2.5"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
            <path
              d="M10 3 5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onNavigate('current')}
          disabled={isCurrentWeek}
          // Disabled "This week" means "you are here", not "unavailable" --
          // the default disabled:opacity-60 reads as broken/greyed-out, so
          // this overrides it to look like a selected/current state instead.
          className="px-3 disabled:cursor-default disabled:bg-surface disabled:text-ink disabled:opacity-100 disabled:shadow-sm"
        >
          This week
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onNavigate('next')}
          aria-label="Next week"
          className="px-2.5"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
            <path
              d="m6 3 5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
}
