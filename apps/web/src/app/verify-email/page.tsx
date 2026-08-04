import Link from 'next/link';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { VerifyEmailStatus } from './verify-email-status';

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
        Meeting Rooms
      </Link>

      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <h1 className="mb-6 text-lg font-semibold text-ink">Email verification</h1>
        <Suspense fallback={<Spinner className="h-5 w-5 text-ink-faint" />}>
          <VerifyEmailStatus />
        </Suspense>
      </div>
    </main>
  );
}
