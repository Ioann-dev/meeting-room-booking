import type { NotificationsResponse } from 'shared';
import { throwIfError } from './api-error';

export async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch('/api/notifications');
  await throwIfError(response);
  return (await response.json()) as NotificationsResponse;
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch('/api/notifications/read-all', { method: 'POST' });
  await throwIfError(response);
}
