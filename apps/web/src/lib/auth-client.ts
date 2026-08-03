import type { CurrentUser } from 'shared';
import { throwIfError } from './api-error';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function register(input: RegisterInput): Promise<CurrentUser> {
  const response = await postJson('/api/auth/register', input);
  await throwIfError(response);
  return (await response.json()) as CurrentUser;
}

export async function login(input: LoginInput): Promise<CurrentUser> {
  const response = await postJson('/api/auth/login', input);
  await throwIfError(response);
  return (await response.json()) as CurrentUser;
}

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  await throwIfError(response);
}

export async function verifyEmail(token: string): Promise<void> {
  const response = await postJson('/api/auth/verify-email', { token });
  await throwIfError(response);
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch('/api/auth/me');
  if (response.status === 401) {
    return null;
  }
  await throwIfError(response);
  return (await response.json()) as CurrentUser;
}
