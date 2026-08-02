# Phase 09 — Booking creation and cancellation UX

**Objective:** Connect the calendar to server-authoritative create/cancel flows with excellent feedback.  
**Target:** 8 meaningful commits.

Execute Phase 09 only.

## Tasks

1. Build booking dialog/drawer opened from a free slot or clear Book action.
2. Fields:
   - room;
   - date;
   - start;
   - end;
   - title;
   - optional weekly recurrence count.
3. Pre-fill room/date/start from selected schedule slot.
4. Client validation should improve UX but must never replace server validation.
5. Show field-level errors and clear API errors.
6. Disable submission while request is pending and prevent accidental double submits.
7. On success:
   - close appropriately;
   - refresh schedule;
   - show success toast;
   - preserve room/week context.
8. On conflict/past/outside-hours/unverified errors, show specific actionable copy.
9. Cancellation:
   - only own bookings expose cancel action;
   - confirmation required;
   - update schedule immediately after successful server response.
10. For recurring booking cancellation, support:
    - one occurrence;
    - entire series.
11. Preserve server ownership enforcement regardless of UI state.
12. Add interaction tests for pending/error/success/cancel states.

## Acceptance criteria

- create flow works from a free slot;
- every mandatory booking failure has understandable UX;
- another user's booking has no cancel UI;
- own cancel is confirmed and reflected;
- recurring choice works.

## Verify and stop

Run web/API tests, lint/typecheck/build, manually test single, conflict, occurrence cancel and series cancel. STOP.
