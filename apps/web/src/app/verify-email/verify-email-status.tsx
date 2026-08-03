'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
        <p role="alert" className="text-red-800">
          This verification link is missing its token.
        </p>
        <Link href="/" className="font-medium underline">
          Return home
        </Link>
      </div>
    );
  }

  if (status === 'verifying') {
    return <p role="status">Verifying your email…</p>;
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col gap-3">
        <p role="status">Your email is now verified.</p>
        <Link href="/" className="font-medium underline">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p role="alert" className="text-red-800">
        {message}
      </p>
      <Link href="/" className="font-medium underline">
        Return home
      </Link>
    </div>
  );
}
