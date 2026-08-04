'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from 'shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ApiError } from '@/lib/api-error';
import { register } from '@/lib/auth-client';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validate(name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    errors.name = 'Name is required';
  } else if (trimmedName.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters`;
  }
  if (email.trim().length === 0) {
    errors.email = 'Email is required';
  }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`;
  }
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useCurrentUser();
  const [name, setName] = useState('');
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

    const errors = validate(name, email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await register({ name, email, password });
      router.push('/schedule');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.messages.join(' ') : 'Registration failed');
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
          <h1 className="text-lg font-semibold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-accent hover:text-accent-strong">
              Log in
            </Link>
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          {serverError && <Alert variant="error">{serverError}</Alert>}

          <FormField label="Name" error={fieldErrors.name}>
            <Input
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>

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
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormField>

          <Button type="submit" loading={pending} className="mt-2 w-full">
            Create account
          </Button>
        </form>
      </div>
    </main>
  );
}
