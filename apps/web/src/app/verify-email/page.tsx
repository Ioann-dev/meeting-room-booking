import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Spinner } from '@/components/ui/spinner';
import { VerifyEmailStatus } from './verify-email-status';

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Email verification">
      <Suspense fallback={<Spinner className="h-5 w-5 text-ink-faint" />}>
        <VerifyEmailStatus />
      </Suspense>
    </AuthShell>
  );
}
