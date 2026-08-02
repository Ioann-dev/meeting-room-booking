# Phase 10 — My Bookings and end-of-booking notifications

**Objective:** Complete personal booking management and the in-app notification bonus.  
**Target:** 8 meaningful commits.

Execute Phase 10 only.

## My Bookings

1. Add authenticated API query/query set for current user's bookings:
   - future active bookings nearest first;
   - past bookings newest first;
   - past pagination or load-more.
2. Return room/date/time/title plus enough identifiers for deep links and cancellation.
3. Build My Bookings screen with upcoming and past sections/tabs.
4. Show localized browser-zone time consistently.
5. Reuse owner cancellation flow for upcoming bookings.
6. Clicking a row deep-links to the room schedule/week containing the booking.
7. Handle loading, empty, error and pagination states.

## Notifications

8. Add `NOTIFY_BEFORE_MINUTES` env configuration with sensible default.
9. Implement an idempotent server-side check/job:
   - find current booking nearing end;
   - only notify if the immediately following slot/booking in the same room is occupied;
   - do not notify if either relevant booking is cancelled;
   - persist a once-only notification.
10. Add authenticated notification API:
    - unread/read state;
    - recent list.
11. Add UI bell/unread indicator and toast/in-app delivery.
12. Ensure notification is delivered exactly once.
13. Add tests for:
    - timing window;
    - following slot occupied;
    - no following booking;
    - current/next cancellation;
    - idempotency.

## Acceptance criteria

- My Bookings ordering and past pagination/load-more are correct;
- deep links open the relevant room/week;
- notifications obey `N`, cancellation and once-only rules.

## Verify and stop

Run My Bookings and notification tests, lint/typecheck/build, manually verify deep link and one notification path. STOP.
