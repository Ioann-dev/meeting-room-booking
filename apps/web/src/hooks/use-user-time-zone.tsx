'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { detectBrowserTimeZone } from '@/lib/timezone';

// Resolved once here and shared via context rather than re-detected by each
// consumer independently: OfficeZoneNotice lives in the persistent app
// shell while the schedule grid remounts on every room-to-room navigation,
// so two independent hook instances can pick up different zones if the
// OS/browser zone changes mid-session -- one stale, one fresh, both visible
// on the same page. A single provider above both means there's only ever
// one resolved value to disagree with.
const UserTimeZoneContext = createContext<string | null>(null);

// Starts `null` and resolves on mount rather than during render: the
// server has no way to know the browser's zone, so resolving it eagerly
// would render a different value during SSR than after hydration.
export function UserTimeZoneProvider({ children }: { children: ReactNode }) {
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      const zone = detectBrowserTimeZone();
      if (!cancelled) {
        setTimeZone(zone);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <UserTimeZoneContext.Provider value={timeZone}>{children}</UserTimeZoneContext.Provider>;
}

export function useUserTimeZone(): string | null {
  return useContext(UserTimeZoneContext);
}
