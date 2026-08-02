# ADR 0001 — Booking interval model and overlap authority

## Status

Accepted.

## Context

The specification requires that a booking may not overlap an existing active booking in the
same room, that adjacent bookings (one ending exactly when another starts) are explicitly
valid, and that if two users race to book the same slot, exactly one booking must persist.
This decision fixes the interval representation and where overlap is finally enforced.

## Decision

### Half-open intervals `[start, end)`

Every booking is modeled as a half-open interval: it includes its start instant and excludes
its end instant. Two intervals `[a1, a2)` and `[b1, b2)` overlap if and only if
`a1 < b2 AND b1 < a2`.

### Why adjacency is valid

With half-open semantics, `[10:00, 11:00)` and `[11:00, 12:00)` do not satisfy the overlap
condition above (`11:00 < 11:00` is false), so they never conflict. This falls directly out
of the interval definition rather than needing a special-cased "adjacent bookings are
allowed" exception in the overlap check — there is exactly one overlap rule, and adjacency is
a property of it, not an exemption from it. A closed-interval model (`[start, end]`) would
require either forbidding legitimate back-to-back bookings or bolting on ad hoc adjacency
logic; half-open avoids both.

### Why PostgreSQL is the final overlap authority

An application-level "check then insert" (`SELECT ... WHERE overlaps; if none, INSERT`) has a
race window: two concurrent requests can both pass the SELECT before either INSERT commits,
producing two overlapping bookings. Closing that window with only application code requires
either a global lock (kills concurrency) or careful per-room advisory locking (easy to get
subtly wrong and easy to regress silently in review).

Instead, the database itself refuses to store an overlap:

```sql
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status = 'active');
```

This requires the `btree_gist` extension (for the equality operator class on `room_id`
inside a GiST exclusion constraint) and a `tstzrange` computed from the stored UTC
`start_at`/`end_at` columns using the same half-open bound flags (`'[)'`) as the application
model, so the constraint's notion of overlap matches the domain's exactly. The `WHERE
(status = 'active')` clause means a cancelled booking's former interval no longer blocks new
bookings, without deleting historical rows.

Under this constraint, when two concurrent transactions attempt to insert overlapping
intervals for the same room, Postgres serializes them at commit time and the second
transaction fails with a `23P01` (exclusion violation) rather than succeeding. The API maps
that specific error code to the same user-facing "slot is occupied" response used for the
ordinary pre-check rejection, so the client sees one consistent error contract regardless of
whether the conflict was caught by the fast application-level check or the database's final
guarantee.

Application code still performs the same overlap check before attempting the insert. That
pre-check is not redundant: it produces the specific, fast, non-racy error message for the
overwhelmingly common non-concurrent case, and it avoids a round trip to the database that
would only fail. The constraint is what makes that check trustworthy under concurrency —
without it, the pre-check would be a race condition wearing a plausible disguise.

## Consequences

- Every table and query that reasons about booking time must consistently use `[start, end)`
  semantics; a single shared overlap predicate in `packages/shared` is the only place this
  logic is written, and both the API's pre-check and any future reporting/query code call it.
- The exclusion constraint requires the `btree_gist` Postgres extension to be enabled in the
  Phase 02 migration.
- Race-condition protection is verified by an integration test that fires concurrent
  create-booking requests at the same slot and asserts exactly one succeeds (`test(concurrency)`
  in the commit plan), not by inspection alone.
