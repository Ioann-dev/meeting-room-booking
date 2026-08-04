# Implementation Checklist

Concise, phase-grouped checklist derived from `docs/requirements-matrix.md` and
`docs/architecture.md`. Each phase's own `prompts/NN-*.md` is the executable instruction;
this is the cross-phase tracking view.

- [x] **01 — Workspace**: npm workspaces (`apps/web`, `apps/api`, `packages/shared`); strict
      TypeScript in all three; root format/lint/typecheck/test scripts; API health check
      surfaced on web; local dev docs.
- [x] **02 — Persistence**: Prisma schema (User, Session, VerificationToken, Room, Booking,
      BookingSeries, Notification); indexes for schedule and history queries; `btree_gist`
      exclusion constraint for active-booking overlap; deterministic room + two test-user
      seed; conflict-free demo bookings; migrate/seed/reset scripts; constraint tests.
- [x] **03 — Authentication**: registration with email canonicalization and validation;
      Argon2id hashing; opaque DB session issuance/guard; logout/revocation; dev email
      verification tokens; login/register screens; session restore on reload; auth tests.
- [x] **04 — Rooms and time**: room list/detail + capacity filter endpoints; centralized
      office-zone/hours/slot constants in `packages/shared`; DST-safe conversion helpers;
      browser-timezone detection and office-zone badge; DST/cross-timezone tests.
- [x] **05 — Booking core**: booking DTOs/domain service; title/alignment/duration
      validation; future + office-hours validation; verified-user + room-existence checks;
      create with DB conflict mapping; active-week schedule query; owner-only cancellation;
      standardized error codes; overlap unit tests; create/cancel integration tests;
      concurrency race test. Post-implementation audit fixes: host-timezone-independent
      instant parsing, real Prisma/Postgres conflict-error matching, bounded overlap query.
- [x] **06 — Recurrence**: weekly recurrence contract; DST-safe occurrence generation;
      transactional series creation with conflict rollback; single-occurrence and
      whole-series cancellation; recurrence metadata on schedule responses; recurrence
      tests; series semantics doc.
- [ ] **07 — Design system**: design tokens/typography; form/action primitives; loading/
      empty/error/dialog/toast primitives; authenticated app shell/nav; room selector +
      capacity filter UI; auth screens aligned to design; shell a11y/responsive hardening.
- [ ] **08 — Weekly grid**: office-week URL state/navigation; timezone-aware slot model;
      custom 7-day CSS grid (no scheduler library); sticky headers/time rail; UTC-to-grid
      position mapping; title/author/ownership rendering; today/current-time highlight;
      office-zone-mismatch explanation; loading/empty/retry states; free-slot preselect;
      booking detail interaction; keyboard focus; slot/timezone/layout tests.
- [ ] **09 — Booking UX**: booking dialog with slot defaults; validated form controls;
      recurrence controls; API validation/conflict error mapping; grid refresh + success
      toast; cancellation confirmation flow; occurrence-vs-series cancel choice; interaction
      tests.
- [ ] **10 — My Bookings and notifications**: upcoming/past query endpoints; upcoming/past
      sections with correct ordering; deep links + pagination; cancellation reuse; persistent
      notification service/API; idempotent ending-soon check; bell/toast delivery;
      notification tests.
- [ ] **11 — Mobile and accessibility**: compact shell/controls; mobile day chips + snap
      scrolling; touch-optimized time rail/event cards; bottom-sheet booking/detail flows;
      focus/label/contrast/reduced-motion fixes; mobile viewport + a11y smoke tests.
- [ ] **12 — Quality and security**: expanded validation/authorization integration matrix;
      hardened concurrency regression coverage; login/booking/cancel E2E smoke; cookie/
      header/CORS/rate-limit hardening; sanitized production errors, no sensitive logging;
      dependency audit; dead-code/duplication removal; stabilized root quality gates.
- [ ] **13 — Delivery**: multi-stage web/API Docker images; Postgres compose stack with
      volume; healthchecks/startup sequencing; CI (format/lint/typecheck/test/build); README
      covering clean-machine launch, seeds, test users, architecture; env template/gitignore/
      clean-clone verification.
- [ ] **14 — Release**: resolve final requirement-audit defects; record verified requirement
      evidence and demo flow; remove debug artifacts; finalize green release.

## Confirmed constraints

- No admin panel at any phase.
- No ready-made calendar/scheduler component at any phase (custom grid only, Phase 08).
- No CQRS, event bus, generic repository layer, or microservice split — three-package
  monorepo only.

## Ambiguities resolved conservatively

| Ambiguity | Resolution | Rationale |
|---|---|---|
| Database engine — spec allows Postgres/MySQL/SQLite | PostgreSQL | Already fixed by `CLAUDE.md` approved stack; also the only option with a native range-type exclusion constraint, which the overlap strategy in ADR 0001 depends on. |
| Backend framework — spec allows NestJS/Express/Next API routes | NestJS | Already fixed by `CLAUDE.md`; gives structured DI/guards for the auth/ownership checks without hand-rolling middleware. |
| Exact wording of validation error messages | Not prescribed by spec beyond "clear message"; left to Phase 05/09 implementation, following the three example categories (occupied, outside hours, in the past) literally | Avoids inventing a message catalog not requested by the spec. |
| Notification delivery channel wording ("bell and/or toast") | Implement both: persistent bell with unread state, plus a toast at the moment a notification is created | Spec says "and/or"; implementing both is a small increment over one and satisfies the requirement either way it's read. |
| Whether all bonus items are in scope | Treat all six bonus items as planned work (dedicated phases 06 and part of 10 exist for recurrence/notifications; the rest are woven into their natural phase) unless the user later descopes one | Development plan's phase index already allocates commits to recurrence and notifications specifically, indicating they were intended as targeted, not optional-and-skipped. |
| Pagination mechanism for Past bookings ("pagination or load-more") | Cursor-based load-more (simplest correct approach for a chronologically ordered, append-only list) | Spec offers either; load-more avoids page-number/offset drift when new bookings are cancelled between page loads. |
| Session cookie `SameSite` policy | `Lax` | Not specified; `Lax` is the standard default for a same-site web app with no cross-site POST requirement, and stricter than `None`. |
| Verification email content in dev | Log a verification URL to the server console/log, no queued email/worker | Spec explicitly says real SMTP is not required in development; a synchronous log line is the minimum that satisfies "an unverified user cannot create a booking" being testable. |
| Whether room schedules are viewable without logging in | Require authentication for every screen, including room schedules; "occupied slots visible to everyone" means visible to all authenticated employees regardless of who made the booking, not public unauthenticated access | The spec frames the whole flow as "an employee" opening a schedule, never mentions a public/anonymous view, and "everyone" reads naturally as "every user of the app," not "every internet visitor." Anonymous read access would also be a bigger surface than the spec asks for. |
| What happens if one occurrence in a weekly recurrence series conflicts at creation time | Reject and roll back the entire series; create nothing rather than skipping the conflicting occurrence | Spec only says recurrence should support cancelling one occurrence or the whole series later — it does not describe partial creation. Silently dropping an occurrence the user asked for is a worse surprise than a single clear "series conflicts on <date>" error asking the user to adjust and resubmit. |

No unrequested features (admin panel, multi-tenant orgs, room booking approval workflow,
etc.) are planned at any phase.
