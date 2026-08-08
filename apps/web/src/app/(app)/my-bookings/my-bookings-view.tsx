'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { OFFICE_TIMEZONE } from 'shared';
import { Tabs } from '@/components/ui/tabs';
import { UpcomingSection } from '@/components/my-bookings/upcoming-section';
import { PastSection } from '@/components/my-bookings/past-section';
import { useUserTimeZone } from '@/hooks/use-user-time-zone';

const TAB_VALUES = ['upcoming', 'past'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string | null): value is TabValue {
  return TAB_VALUES.includes(value as TabValue);
}

export function MyBookingsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userTimeZone = useUserTimeZone();
  const displayZone = userTimeZone ?? OFFICE_TIMEZONE;

  const tabParam = searchParams.get('tab');
  const tab: TabValue = isTabValue(tabParam) ? tabParam : 'upcoming';

  function handleTabChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">My Bookings</h1>
        <p className="mt-1.5 text-sm text-ink-subtle">Your upcoming and past room bookings.</p>
      </div>
      <Tabs
        label="My bookings sections"
        value={tab}
        onValueChange={handleTabChange}
        items={[
          {
            value: 'upcoming',
            label: 'Upcoming',
            content: <UpcomingSection displayZone={displayZone} />,
          },
          { value: 'past', label: 'Past', content: <PastSection displayZone={displayZone} /> },
        ]}
      />
    </div>
  );
}
