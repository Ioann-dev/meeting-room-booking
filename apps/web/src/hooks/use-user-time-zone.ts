'use client';

import { useEffect, useState } from 'react';
import { detectBrowserTimeZone } from '@/lib/timezone';

// Starts `null` and resolves on mount rather than during render: the
// server has no way to know the browser's zone, so resolving it eagerly
// would render a different value during SSR than after hydration.
export function useUserTimeZone(): string | null {
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

  return timeZone;
}
