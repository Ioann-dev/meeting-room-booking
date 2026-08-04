'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
      <p className="text-sm text-ink-subtle">{error.message || 'An unexpected error occurred.'}</p>
      <Button type="button" variant="secondary" onClick={() => unstable_retry()}>
        Try again
      </Button>
    </main>
  );
}
