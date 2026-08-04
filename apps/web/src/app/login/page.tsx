'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ApiError } from '@/lib/api-error';
import { login } from '@/lib/auth-client';

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (email.trim().length === 0) {
    errors.email = 'Email is required';
  }
  if (password.length === 0) {
    errors.password = 'Password is required';
  }
  return errors;
}

export default function LoginPage() {
  const router = useRouter();
  const { status } = useCurrentUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/schedule');
    }
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await login({ email, password });
      router.push('/schedule');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.messages.join(' ') : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  if (status === 'authenticated') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-ink-faint" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
        Meeting Rooms
      </Link>

      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-ink">Log in</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Need an account?{' '}
            <Link href="/register" className="font-medium text-accent hover:text-accent-strong">
              Register
            </Link>
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          {serverError && <Alert variant="error">{serverError}</Alert>}

          <FormField label="Email" error={fieldErrors.email}>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>

          <FormField label="Password" error={fieldErrors.password}>
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormField>

          <Button type="submit" loading={pending} className="mt-2 w-full">
            Log in
          </Button>
        </form>
      </div>
    </main>
  );
}
