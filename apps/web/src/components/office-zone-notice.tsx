'use client';

import { OFFICE_TIMEZONE } from 'shared';
import { useUserTimeZone } from '@/hooks/use-user-time-zone';

/**
 * A compact metadata line, not a full alert box: both zones stay explicit
 * (office/Kyiv vs. the viewer's own), but the previous full-width Alert
 * read as more visually dominant than a passive, always-true piece of
 * context warrants. role="status" preserves the same passive-announcement
 * behavior Alert variant="info" had (Alert maps "info" to role="status"
 * too), so this is not an accessibility regression.
 */
export function OfficeZoneNotice() {
  const userTimeZone = useUserTimeZone();

  if (!userTimeZone || userTimeZone === OFFICE_TIMEZONE) {
    return null;
  }

  return (
    <p role="status" className="text-xs text-ink-subtle">
      Office: <strong className="font-medium text-ink">{OFFICE_TIMEZONE}</strong>
      <span aria-hidden="true" className="mx-1.5 text-ink-faint">
        ·
      </span>
      Your time: <strong className="font-medium text-ink">{userTimeZone}</strong>
    </p>
  );
}
