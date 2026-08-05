'use client';

import { getOfficeWeekDays } from 'shared';
import { Button } from '@/components/ui/button';

interface WeekNavigationProps {
  weekStartUtc: string;
  isCurrentWeek: boolean;
  onNavigate: (direction: 'previous' | 'next' | 'current') => void;
}

// Used only to format a known office-local calendar date for display -- never
// to derive or store it, so this has no bearing on the UTC/office-zone
// semantics the actual date arithmetic already handles.
function formatDayLabel(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function WeekNavigation({ weekStartUtc, isCurrentWeek, onNavigate }: WeekNavigationProps) {
  const [first, , , , , , last] = getOfficeWeekDays(weekStartUtc);
  const rangeLabel =
    first.month === last.month
      ? `${formatDayLabel(first.year, first.month, first.day)} – ${last.day}, ${last.year}`
      : `${formatDayLabel(first.year, first.month, first.day)} – ${formatDayLabel(last.year, last.month, last.day)}, ${last.year}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-ink">{rangeLabel}</p>
        <p className="text-xs text-ink-subtle">Office hours, Europe/Kyiv</p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="secondary"
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
          variant="secondary"
          onClick={() => onNavigate('current')}
          disabled={isCurrentWeek}
        >
          This week
        </Button>
        <Button
          type="button"
          variant="secondary"
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
