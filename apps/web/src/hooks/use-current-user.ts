'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CurrentUser } from 'shared';
import { fetchCurrentUser } from '@/lib/auth-client';

type CurrentUserState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: CurrentUser }
  | { status: 'unauthenticated'; user: null };

async function loadCurrentUser(): Promise<CurrentUserState> {
  try {
    const user = await fetchCurrentUser();
    return user ? { status: 'authenticated', user } : { status: 'unauthenticated', user: null };
  } catch {
    return { status: 'unauthenticated', user: null };
  }
}

export function useCurrentUser() {
  const [state, setState] = useState<CurrentUserState>({ status: 'loading', user: null });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const next = await loadCurrentUser();
      if (!cancelled) {
        setState(next);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setState({ status: 'loading', user: null });
    setState(await loadCurrentUser());
  }, []);

  const setUser = useCallback((user: CurrentUser) => {
    setState({ status: 'authenticated', user });
  }, []);

  const clearUser = useCallback(() => {
    setState({ status: 'unauthenticated', user: null });
  }, []);

  return { ...state, refresh, setUser, clearUser };
}
