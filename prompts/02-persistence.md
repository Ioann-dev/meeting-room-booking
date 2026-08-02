# Phase 02 — Database schema, migrations and deterministic seeds

**Objective:** Establish persistent storage, constraints and repeatable demo data.  
**Target:** 9 meaningful commits.

Execute Phase 02 only: PostgreSQL + Prisma foundation.

## Tasks

1. Configure PostgreSQL and Prisma in `apps/api`.
2. Model:
   - `User`
   - `Session`
   - `EmailVerificationToken`
   - `Room`
   - `Booking`
   - `BookingSeries`
   - `Notification`
3. User persistence:
   - required display name;
   - canonical email = trim + lowercase;
   - unique canonical email;
   - `passwordHash` only.
4. Session persistence:
   - opaque token identifier/hash;
   - user relation;
   - expiry;
   - revocation/deletion path.
5. Room:
   - name;
   - floor;
   - capacity;
   - stable seed identity.
6. Booking:
   - UTC `startAt`/`endAt`;
   - title;
   - room/user relations;
   - cancellation state/timestamp;
   - optional series relation;
   - timestamps.
7. BookingSeries:
   - owner/room;
   - local recurrence metadata needed to reproduce weekly office-local recurrence safely.
8. Notification:
   - recipient;
   - booking reference(s);
   - type;
   - created/read/delivered state;
   - idempotency key or equivalent once-only guard.
9. Add indexes for:
   - room + time-window schedule queries;
   - user upcoming/past queries;
   - active series/cancellation lookup;
   - notification delivery.
10. Add PostgreSQL-level protection against overlapping active bookings in the same room using a robust range/exclusion strategy. Adjacent `[start,end)` intervals must remain valid.
11. Map cancellations so cancelled bookings no longer block future slots without deleting audit/history unnecessarily.
12. Create migrations.
13. Add deterministic seed data:
   - 5–6 rooms with name/floor/capacity;
   - 2 test users with documented credentials;
   - several conflict-free demo bookings.
14. Add reset/migrate/seed scripts useful for local development/tests.
15. Add tests proving:
   - canonical-email uniqueness;
   - adjacent bookings are allowed;
   - overlap is rejected by the database;
   - cancellation releases the slot.

## Acceptance criteria

- schema migrates from empty DB;
- seed is repeatable;
- no plaintext password is stored;
- database itself prevents active overlap;
- adjacency succeeds;
- tests are deterministic.

## Verify and stop

Run migration/seed from a clean database, relevant DB tests, root lint/typecheck/test/build as appropriate, then STOP.
