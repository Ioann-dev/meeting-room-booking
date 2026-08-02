# Phase 06 — Weekly recurring bookings and series cancellation

**Objective:** Implement weekly recurrence without weakening single-booking invariants.  
**Target:** 9 meaningful commits.

Execute Phase 06 only.

## Tasks

1. Extend create-booking contract with optional weekly recurrence count; support the specification example of 8.
2. Generate weekly occurrences using office-local calendar semantics in `Europe/Kyiv`, then convert each occurrence to UTC. Do not add a fixed number of UTC hours/days across DST.
3. Represent recurring bookings with `BookingSeries` plus individual `Booking` rows.
4. Apply the same validation to every occurrence:
   - alignment;
   - duration;
   - office hours;
   - future;
   - room existence;
   - verification;
   - overlap/race safety.
5. Create the series transactionally/all-or-nothing. If any occurrence conflicts, rollback the complete series and report the conflicting occurrence clearly.
6. Preserve database-level overlap protection for all occurrences.
7. Support cancelling one occurrence.
8. Support cancelling all active occurrences of a series owned by the user.
9. Foreign users cannot cancel occurrences or series.
10. Schedule responses include enough series metadata for later UI choices.
11. Tests:
    - create valid weekly series;
    - DST-crossing recurrence keeps office-local wall time;
    - conflict in one occurrence rolls back all;
    - cancel one occurrence;
    - cancel series;
    - foreign cancellation rejected.

## Acceptance criteria

- weekly recurrence behaves in office-local time;
- no partial series is left after a creation conflict;
- ownership remains authoritative;
- single-booking behavior is unchanged.

## Verify and stop

Run recurrence tests plus all booking tests and build checks. STOP.
