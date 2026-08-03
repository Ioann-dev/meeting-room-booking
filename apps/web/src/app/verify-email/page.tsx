import { Suspense } from 'react';
import { VerifyEmailStatus } from './verify-email-status';

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">Email verification</h1>
      <Suspense fallback={<p role="status">Loading…</p>}>
        <VerifyEmailStatus />
      </Suspense>
    </main>
  );
}
