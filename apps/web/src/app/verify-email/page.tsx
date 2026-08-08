import Link from 'next/link';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { WordmarkIcon } from '@/components/shell/app-header';
import { VerifyEmailStatus } from './verify-email-status';

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-canvas px-4 py-12">
      <Link href="/" className="flex items-center gap-2.5">
        <WordmarkIcon />
        <span className="text-sm font-semibold tracking-tight text-ink">Meeting Rooms</span>
      </Link>

      <div className="w-full max-w-[26rem] rounded-lg border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Email verification</h1>
        <Suspense fallback={<Spinner className="h-5 w-5 text-ink-faint" />}>
          <VerifyEmailStatus />
        </Suspense>
      </div>
    </main>
  );
}
