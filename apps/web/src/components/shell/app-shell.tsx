'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ErrorState } from '@/components/ui/error-state';
import { Spinner } from '@/components/ui/spinner';
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

function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
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

  if (status === 'loading' || status === 'unauthenticated' || health === 'checking') {
    return <FullPageLoading />;
  }

  if (health === 'error') {
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
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-md"
      >
        Skip to content
      </a>
      <AppHeader user={user} onLoggedOut={clearUser} />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
