'use client';

import { OFFICE_TIMEZONE } from 'shared';
import { useUserTimeZone } from '@/hooks/use-user-time-zone';

/**
 * A slim, full-width context band directly under the header's main row --
 * both zones stay explicit (office/Kyiv vs. the viewer's own) as shell-level
 * chrome rather than a line repeated at the top of every page's own content.
 * role="status" preserves the same passive-announcement behavior Alert
 * variant="info" had (Alert maps "info" to role="status" too), so this is
 * not an accessibility regression.
 */
export function OfficeZoneNotice() {
  const userTimeZone = useUserTimeZone();

  if (!userTimeZone || userTimeZone === OFFICE_TIMEZONE) {
    return null;
  }

  return (
    <div className="border-b border-border bg-[#F5F6FF]">
      <div className="mx-auto flex w-full max-w-7xl min-h-[40px] items-center px-4 py-2 sm:px-6 lg:px-8">
        <p role="status" className="flex items-center gap-1.5 text-xs text-ink-subtle">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-ink-faint"
          >
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M8 4.5V8l2.5 1.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Office <strong className="font-medium text-ink">{OFFICE_TIMEZONE}</strong>
          <span aria-hidden="true" className="text-ink-faint">
            ·
          </span>
          Your time <strong className="font-medium text-ink">{userTimeZone}</strong>
        </p>
      </div>
    </div>
  );
}
