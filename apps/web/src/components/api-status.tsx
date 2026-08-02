'use client';

import { useEffect, useState } from 'react';
import type { HealthStatus } from 'shared';

type ConnectionState =
  { phase: 'loading' } | { phase: 'connected'; health: HealthStatus } | { phase: 'error' };

export function ApiStatus() {
  const [state, setState] = useState<ConnectionState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }
        const health = (await response.json()) as HealthStatus;
        if (!cancelled) {
          setState({ phase: 'connected', health });
        }
      } catch {
        if (!cancelled) {
          setState({ phase: 'error' });
        }
      }
    }

    void checkHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === 'loading') {
    return <p role="status">Checking API connectivity…</p>;
  }

  if (state.phase === 'error') {
    return <p role="alert">API is unavailable. Some features may not work.</p>;
  }

  return <p role="status">API connected — status: {state.health.status}</p>;
}
