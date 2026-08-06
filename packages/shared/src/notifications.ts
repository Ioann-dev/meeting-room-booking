// Not otherwise specified by the participant spec beyond "a recent list";
// caps how many rows the bell panel ever needs to render at once.
export const NOTIFICATIONS_LIST_LIMIT = 20;

export type NotificationType = 'BOOKING_ENDING_SOON';

/**
 * A notification as returned by GET /notifications. `justDelivered` is true
 * only in the one response where the server just flipped this row's
 * `deliveredAt` from null to now -- the atomic, once-only signal the client
 * uses to decide "show a toast for this now" without needing any local
 * seen-id tracking of its own (see NotificationsService.listForUser).
 */
export interface NotificationSummary {
  id: string;
  type: NotificationType;
  roomName: string;
  endingBookingTitle: string;
  /** UTC instant ISO string of when the ending booking's slot finishes. */
  endingBookingEndAt: string;
  createdAt: string;
  readAt: string | null;
  justDelivered: boolean;
}

export interface NotificationsResponse {
  items: NotificationSummary[];
  unreadCount: number;
}
