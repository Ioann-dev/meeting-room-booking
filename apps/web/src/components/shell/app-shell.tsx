'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { UserTimeZoneProvider } from '@/hooks/use-user-time-zone';
import { ErrorState } from '@/components/ui/error-state';
import { Spinner } from '@/components/ui/spinner';
import { OfficeZoneNotice } from '@/components/office-zone-notice';
import { AppHeader } from './app-header';

type HealthState = 'checking' | 'ok' | 'error';

async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch {
    return false;
  }
}

function ContentLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-6 w-6 text-ink-faint" />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, user, clearUser } = useCurrentUser();
  const [health, setHealth] = useState<HealthState>('checking');
  const [healthAttempt, setHealthAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void checkHealth().then((ok) => {
      if (!cancelled) {
        setHealth(ok ? 'ok' : 'error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [healthAttempt]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // Covers session bootstrap, the brief unauthenticated tick before the
  // redirect above fires, and the health check -- none of these have
  // anything content-shaped to show yet, but the persistent shell
  // (wordmark, nav, timezone banner) below needs none of them either, so
  // only the content region collapses to a spinner instead of the whole
  // page going blank and header-less.
  const isLoadingShell =
    status === 'loading' || status === 'unauthenticated' || health === 'checking';

  // Distinct from the loading case: the server is confirmed unreachable,
  // not just not-yet-checked, and every other piece of shell chrome
  // (notification bell, nav) would also fail against it -- this stays a
  // dedicated full-page takeover rather than a half-working shell around
  // a component that can't do anything useful.
  if (!isLoadingShell && health === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ErrorState
          title="Can't reach the server"
          description="The application server is unavailable right now. Check your connection and try again."
          onRetry={() => {
            setHealth('checking');
            setHealthAttempt((attempt) => attempt + 1);
          }}
        />
      </div>
    );
  }

  return (
    <UserTimeZoneProvider>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-md"
        >
          Skip to content
        </a>
        <AppHeader user={user} onLoggedOut={clearUser} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
        >
          <OfficeZoneNotice />
          {/* mt-3, not mt-6: OfficeZoneNotice is now a single compact text
              line rather than a bordered Alert box, so the trailing space
              before page content only needs to be proportionate to that
              smaller footprint. */}
          <div className="mt-3 first:mt-0">{isLoadingShell ? <ContentLoading /> : children}</div>
        </main>
      </div>
    </UserTimeZoneProvider>
  );
}
