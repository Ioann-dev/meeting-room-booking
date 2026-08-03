'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from 'shared';
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      router.push('/');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.messages.join(' ') : 'Registration failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        {serverError && (
          <p
            role="alert"
            className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {serverError}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.name && (
            <p id="name-error" className="text-sm text-red-700">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.email && (
            <p id="email-error" className="text-sm text-red-700">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.password && (
            <p id="password-error" className="text-sm text-red-700">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </main>
  );
}
