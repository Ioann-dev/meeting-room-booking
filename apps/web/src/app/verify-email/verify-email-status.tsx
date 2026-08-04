'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api-error';
import { verifyEmail } from '@/lib/auth-client';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    async function run() {
      try {
        await verifyEmail(token as string);
        if (!cancelled) {
          setStatus('success');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(error instanceof ApiError ? error.messages.join(' ') : 'Verification failed');
        }
      }
    }
    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="error">This verification link is missing its token.</Alert>
        <Link href="/" className="text-sm font-medium text-accent hover:text-accent-strong">
          Return home
        </Link>
      </div>
    );
  }

  if (status === 'verifying') {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-ink-subtle">
        <Spinner className="h-4 w-4" />
        Verifying your email…
      </p>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="success">Your email is now verified.</Alert>
        <Link href="/" className="text-sm font-medium text-accent hover:text-accent-strong">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Alert variant="error">{message}</Alert>
      <Link href="/" className="text-sm font-medium text-accent hover:text-accent-strong">
        Return home
      </Link>
    </div>
  );
}
