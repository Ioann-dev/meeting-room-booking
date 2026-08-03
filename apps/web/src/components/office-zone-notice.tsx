'use client';

import { OFFICE_TIMEZONE } from 'shared';
import { useUserTimeZone } from '@/hooks/use-user-time-zone';

export function OfficeZoneNotice() {
  const userTimeZone = useUserTimeZone();

  if (!userTimeZone || userTimeZone === OFFICE_TIMEZONE) {
    return null;
  }

  return (
    <p
      role="status"
      className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
    >
      Office hours are in <strong>{OFFICE_TIMEZONE}</strong> time. Times shown to you are converted
      to your local zone, <strong>{userTimeZone}</strong>.
    </p>
  );
}
