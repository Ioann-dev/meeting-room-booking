'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { isValidEmailFormat } from 'shared';
import { AuthShell } from '@/components/auth/auth-shell';
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
  } else if (!isValidEmailFormat(email)) {
    errors.email = 'Enter a valid email address';
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

  // Re-validates a single field against its own already-displayed error
  // and clears just that error once the field is valid again -- errors
  // are still only ever *shown* after a submit attempt (handleSubmit is
  // the one place that can set a new one), so this never validates
  // eagerly on first keystroke; it only ever removes stale, already-wrong
  // information once the user has actually fixed it.
  function clearFieldErrorIfNowValid(
    field: keyof FieldErrors,
    nextEmail: string,
    nextPassword: string,
  ) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const revalidated = validate(nextEmail, nextPassword);
      if (revalidated[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    clearFieldErrorIfNowValid('email', value, password);
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    clearFieldErrorIfNowValid('password', email, value);
  }

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
    <AuthShell
      title="Log in"
      subtitle={
        <>
          Need an account?{' '}
          <Link
            href="/register"
            className="font-medium text-accent transition-colors duration-150 ease-premium hover:text-accent-strong"
          >
            Register
          </Link>
        </>
      }
    >
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
            onChange={(event) => handleEmailChange(event.target.value)}
          />
        </FormField>

        <FormField label="Password" error={fieldErrors.password}>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => handlePasswordChange(event.target.value)}
          />
        </FormField>

        <Button type="submit" loading={pending} className="mt-2 w-full">
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}
