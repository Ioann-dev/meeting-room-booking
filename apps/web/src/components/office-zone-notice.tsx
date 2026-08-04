'use client';

import { OFFICE_TIMEZONE } from 'shared';
import { Alert } from '@/components/ui/alert';
import { useUserTimeZone } from '@/hooks/use-user-time-zone';

export function OfficeZoneNotice() {
  const userTimeZone = useUserTimeZone();

  if (!userTimeZone || userTimeZone === OFFICE_TIMEZONE) {
    return null;
  }

  return (
    <Alert variant="info">
      Office hours are in <strong>{OFFICE_TIMEZONE}</strong> time. Times shown to you are converted
      to your local zone, <strong>{userTimeZone}</strong>.
    </Alert>
  );
}
