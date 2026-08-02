# Phase 05 — Booking core, authorization and database race safety

**Objective:** Implement the mandatory booking engine with correct interval semantics and concurrency protection.  
**Target:** 11 meaningful commits.

Execute Phase 05 only. Keep UI minimal.

## Tasks

1. Add booking DTOs, service and controller.
2. Server-side create validation:
   - title required, 1–100 chars;
   - valid room;
   - verified authenticated user;
   - start/end on 30-minute boundaries;
   - duration 30 minutes–4 hours;
   - strictly future;
   - completely inside `09:00–19:00 Europe/Kyiv`;
   - no overlap with active booking.
3. Use half-open semantics `[start,end)` everywhere.
4. Adjacent bookings must be valid.
5. Convert accepted client input to UTC instants before persistence.
6. Do not trust client-provided user identity/author.
7. Use PostgreSQL as final overlap authority and map race conflicts to a clear conflict response.
8. Add schedule query endpoint for a room/week:
   - active bookings only;
   - title;
   - author display name;
   - ownership flag/owner identifier safe for UI;
   - UTC start/end;
   - recurrence metadata if available later.
9. Add owner-only cancellation:
   - cancel own active booking;
   - reject another user's cancellation even through direct API;
   - define idempotent behavior clearly.
10. Standardize useful API error codes/messages for:
    - conflict;
    - past;
    - outside hours;
    - invalid alignment;
    - invalid duration;
    - unverified user;
    - forbidden cancellation.
11. Required interval unit tests under root `npm test`:
    - adjacency;
    - partial overlap;
    - full overlap;
    - containment;
    - neighboring days.
12. Integration tests for valid create, validation failures, own cancel, foreign cancel.
13. Concurrency test:
    - fire two simultaneous requests for same room/slot;
    - assert exactly one active booking persists.

## Acceptance criteria

- all mandatory booking rules are server-authoritative;
- adjacency succeeds;
- overlap fails;
- parallel race persists exactly one booking;
- non-owner cancellation fails.

## Verify and stop

Run interval tests, booking integration tests, concurrency test, lint/typecheck/build. STOP.
