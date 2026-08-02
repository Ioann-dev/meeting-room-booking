# Phase 14 — Final acceptance audit and release polish

**Objective:** Run a requirement-by-requirement release gate and ship only when critical paths are green.  
**Target:** 3 meaningful commits.

Execute Phase 14 only. Do not add unrelated features.

## Tasks

1. Re-open the official specification and `docs/requirements-matrix.md`.
2. Verify every mandatory item and every claimed bonus against running code/product.
3. Perform manual acceptance with two users:
   - registration normalization;
   - login/logout/refresh persistence;
   - verification gate;
   - room selection/capacity filter;
   - week navigation;
   - foreign booking title/author visibility;
   - valid booking;
   - adjacency allowed;
   - overlap rejected;
   - past/outside-hours rejected;
   - foreign cancellation blocked;
   - own cancellation;
   - My Bookings upcoming/past/deep-link;
   - recurring create/cancel occurrence/cancel series;
   - concurrent same-slot race;
   - notification once-only behavior;
   - time-zone difference behavior;
   - mobile flow.
4. Run complete automated gate:
   - format check;
   - lint;
   - typecheck;
   - `npm test`;
   - integration tests;
   - E2E smoke;
   - production builds.
5. Run dependency/security audit.
6. Inspect server/client logs for warnings, stack traces, hydration errors and noisy debug logging.
7. Inspect Git history for:
   - accidental giant commits;
   - secrets;
   - generated artifacts;
   - unrelated changes.
   Do not rewrite legitimate history merely for appearance.
8. Verify dependencies contain no ready-made calendar/scheduler library.
9. Fix only defects found by the audit.
10. Mark requirements in `docs/requirements-matrix.md` as VERIFIED with evidence.
11. Add `RELEASE_CHECKLIST.md` with exact commands that passed and honest non-critical limitations.

## Release gate

Do not declare complete while:
- any mandatory requirement is red;
- any known test fails;
- clean-machine startup is broken;
- another user can cancel a booking they do not own.

## Final report

Return:
- total meaningful commit count;
- exact commands passed;
- mandatory requirement status;
- bonus requirement status;
- known limitations;
- recommended evaluator demo script.

Then STOP.
