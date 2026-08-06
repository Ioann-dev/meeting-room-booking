# Requirements Matrix

Maps every participant-facing requirement from `docs/original-spec-participant-requirements.md`
to its implementation area, planned phase, and verification method.

Phase numbers refer to `prompts/NN-*.md`. "Manual QA" means a scripted check performed during
Phase 14 release audit against the running application; it is not a substitute for automated
coverage where automated coverage is feasible.

**Status** column added during Phase 14's release audit (2026-08-07). Every row is VERIFIED —
either by a still-passing automated test (cited by file), or by a live manual check performed
against the running dev stack during the Phase 14 Chrome smoke test, or both. No row is red.

## Authentication

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Registration collects name, email, password | api auth, web auth screens | 03, 09→07 UI polish | Integration test (Supertest) + manual QA | VERIFIED — `apps/api/test/auth.e2e-spec.ts`; manual: registered a new account live in Chrome, immediate authenticated session |
| Email unique after trim + case-insensitive compare | api auth (DB constraint + service check) | 02 (constraint), 03 (service) | Unit test on canonicalization + integration test on duplicate registration | VERIFIED — `auth.e2e-spec.ts` "rejects a second registration whose email differs only by case"; manual: registered `Phase14.Tester@Example.COM`, canonicalized correctly |
| Name must be non-empty | api auth DTO validation | 03 | Unit test (DTO validator) | VERIFIED — `apps/api/src/auth/dto/register.dto.ts` + validation tests |
| Name displayed as booking author in schedule | web schedule grid | 08 | Component/E2E check | VERIFIED — manual: "Team Retro / Bob Smith" visible on Athens schedule to a different logged-in user |
| Names need not be unique | api auth (no uniqueness constraint on name) | 02, 03 | Integration test (two users, same name) | VERIFIED — no unique constraint on `User.name` in schema |
| Password length 8–72 chars, no composition rules | api auth DTO validation | 03 | Unit test (boundary values 7/8/72/73) | VERIFIED — `apps/api/src/auth/password.util.spec.ts`, `register.dto.ts` |
| Server-side validation is authoritative | api auth, api booking | 03, 05 | Integration test bypassing client (direct API calls) | VERIFIED — every `*.e2e-spec.ts` file in `apps/api/test/` calls the API directly, not through the UI |
| Validation failures shown with clear messages | web auth forms | 07/09 | Manual QA + component test | VERIFIED — manual: verification-gate rejection showed "Verify your email to book a room -- check the link we sent when you registered." both as a client warning and a server-confirmed error |
| Login | api auth, web auth screen | 03 | Integration test + manual QA | VERIFIED — `auth.e2e-spec.ts`; manual: logged in as `alice@example.com` |
| Logout | api auth, web auth screen | 03 | Integration test (session revoked after logout) | VERIFIED — `auth.e2e-spec.ts` "deletes the session server-side on logout, invalidating the cookie"; manual: logout redirected to `/login` |
| Session survives page reload | web session bootstrap, api session cookie | 03 | Playwright smoke test | VERIFIED — `apps/web/e2e/booking-flow.spec.ts`; manual: session persisted across multiple navigations without re-authenticating |

## Rooms

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Seed 5–6 rooms with name, floor, capacity | db seed | 02 | Seed script run + assertion in seed test | VERIFIED — manual: 6 rooms visible (Athens, Berlin, Copenhagen, Dublin, Edinburgh, Florence) with floor/capacity |
| No admin panel | (absence of feature) | all | Code review checklist item in Phase 14 audit | VERIFIED — no admin routes/components exist anywhere in `apps/web/src/app` |
| Office hours 09:00–19:00, Europe/Kyiv, for all rooms | shared time constants | 04 | Unit test on office-hours constant usage | VERIFIED — `packages/shared/src/office.ts`; banner shown on every schedule page |

## Room schedule

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Weekly grid: days horizontal, time vertical, 30-min slots | web custom grid | 08 | Component test on slot generation | VERIFIED — `apps/web/src/components/schedule/weekly-grid.tsx` + `.test.tsx`; manual visual confirmation |
| Occupied slots visible to everyone | api schedule query, web grid render | 05, 08 | Integration test (User B, authenticated, sees User A's booking on a shared room schedule) | VERIFIED — `apps/api/test/booking.e2e-spec.ts`; manual: Bob's "Team Retro" visible while logged in as Alice |
| Occupied slot shows title + author | web grid render | 08 | Component test | VERIFIED — manual confirmation on Athens schedule |
| Previous/next week navigation | web schedule URL state | 08 | Component/E2E test | VERIFIED — manual: navigated forward 3 weeks and back during recurring-booking testing |
| Grid implemented by the project, no ready-made scheduler library | web custom grid | 08 | Code review checklist item (no FullCalendar/RBC/DayPilot/Scheduler dependency) | VERIFIED — Phase 14 dependency grep across all `package.json` files found nothing |

## User time zone

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| All UI times shown in browser time zone | web time display | 04, 08 | Unit test (fixed offset fixtures) + manual QA in a non-Kyiv browser zone | VERIFIED — manual: browser zone is Europe/Berlin; booking confirmation toasts and My Bookings rows consistently showed Berlin-local times (e.g. a 15:00–16:00 Kyiv booking displayed/confirmed as 14:00–15:00) |
| Office-zone notice when user zone differs | web schedule header | 08 | Component test (zone mismatch renders badge) | VERIFIED — "Office hours are in Europe/Kyiv time. Times shown to you are converted to your local zone, Europe/Berlin." banner visible on every screen this session |
| Working-hours validation always in Europe/Kyiv | api booking validation | 04, 05 | Unit test across DST transition dates | VERIFIED — `packages/shared/src/time.spec.ts` |

## Create booking

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Room, date, start time, end time, title inputs | web booking form | 09 | Component test | VERIFIED — manual: booking-create dialog exercised repeatedly |
| Title required, 1–100 chars | shared validation, api DTO | 05 | Unit test (boundary values) | VERIFIED — `apps/api/src/booking/dto/create-booking.dto.ts` |
| Start/end align to 30-minute boundaries | shared validation, api DTO | 05 | Unit test | VERIFIED — `apps/api/test/booking.e2e-spec.ts` "rejects a start/end not on the 30-minute grid" |
| Duration 30 min–4 h | shared validation, api DTO | 05 | Unit test (boundary values) | VERIFIED — `booking.e2e-spec.ts` "rejects a duration outside 30 minutes–4 hours" |
| Booking is only inside office working hours | api booking service | 05 | Unit + integration test | VERIFIED — `booking.e2e-spec.ts` "rejects a booking outside office hours" |
| Booking is only in the future | api booking service | 05 | Unit test (fixed clock) | VERIFIED — `booking.e2e-spec.ts` "rejects a booking that starts in the past" |
| Booking may not overlap an existing booking | api booking service + DB constraint | 02, 05 | Unit test (interval overlap matrix) + integration test | VERIFIED — `booking.e2e-spec.ts`; manual: live overlap attempt on Athens rejected with "This slot was just booked by someone else. Pick another time." |
| Adjacent bookings are valid (e.g. 10:00–11:00 and 11:00–12:00) | shared interval logic, DB constraint | 02, 05 | Unit test (adjacency case) | VERIFIED — `booking.e2e-spec.ts` "allows an adjacent booking that starts exactly when the first ends"; manual: live 16:00–17:00 booking accepted immediately after an existing 15:00–16:00 booking |

## Errors

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Clear message for occupied slot / outside hours / past time | api error mapping, web error display | 05, 09 | Integration test on each rejection reason + manual QA | VERIFIED — `apps/web/src/lib/booking-error-copy.ts`; manual: saw the occupied-slot and verification-gate messages live |
| The server must enforce these rules, not only the form | api booking service | 05 | Integration test calling API directly with invalid payloads | VERIFIED — every rejection case in `booking.e2e-spec.ts` is a direct API call |

## Cancellation

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| User may cancel own booking | api booking service, web cancel action | 05, 09 | Integration test + manual QA | VERIFIED — `booking.e2e-spec.ts`; manual: cancelled two own bookings via the confirmation dialog |
| Another user's booking is not cancellable via UI | web cancel action (no control rendered) | 09 | Component test | VERIFIED — manual: opened Bob's "Team Retro" as Alice — dialog showed "Another attendee's booking" with no Cancel control at all |
| Another user's booking is not cancellable via direct API request | api authorization guard | 05 | Integration test (cross-user cancel attempt returns 403/404) | VERIFIED — `booking.e2e-spec.ts` "rejects cancellation by a non-owner, even via a direct API call" |

## My Bookings

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Upcoming section, nearest first, cancel button | api my-bookings query, web page | 10 | Integration test (ordering) + component test | VERIFIED — `apps/api/test/my-bookings.e2e-spec.ts`; manual: Upcoming tab showed both live-created bookings nearest-first |
| Past section, most recent first, pagination/load-more | api my-bookings query, web page | 10 | Integration test (ordering + pagination) | VERIFIED — `my-bookings.e2e-spec.ts`; manual: Past tab showed correct most-recent-first order, cancelled items marked with a non-color "✕ Cancelled" indicator, and a "You've reached the end." pagination boundary marker |
| Row shows date, time, room, title | web my-bookings list | 10 | Component test | VERIFIED — manual confirmation |
| Time shown in user's time zone | web my-bookings list | 10 | Component test (fixed offset fixture) | VERIFIED — manual: Berlin-local time shown with Kyiv-equivalent in parentheses |
| Clicking a booking navigates to the relevant room schedule and corresponding week | web navigation | 10 | E2E test (Playwright) | VERIFIED — `apps/web/e2e/booking-flow.spec.ts`; manual: clicking a booking row landed on Athens at the exact week containing it |

## Interface expectations

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Consistent spacing/typography/colors across screens | design tokens, shared UI primitives | 07 | Visual/manual QA | VERIFIED — visual review across the full Phase 14 Chrome session |
| Loading states | all async screens | 07–10 | Component test per screen | VERIFIED — existing component test suite (`*.test.tsx` loading-state cases), all passing |
| Empty states | schedule, my-bookings | 08, 10 | Component test | VERIFIED — manual: "No upcoming bookings" empty state with "Browse rooms" CTA shown after cancelling all test bookings |
| Error states, no blank page/infinite spinner when server unavailable | app shell, data-fetch layer | 07 | Component test (forced fetch failure) | VERIFIED — `apps/web/src/components/ui/error-state.tsx` and its tests |
| Field errors displayed close to fields | web forms | 07/09 | Component test | VERIFIED — `apps/web/src/components/ui/form-field.tsx` pattern used throughout |
| Submit buttons disabled while a request is running | web forms | 09 | Component test | VERIFIED — `apps/web/src/components/ui/button.tsx` loading prop + tests |
| Current day and current time highlighted in the schedule | web schedule grid | 08 | Component test (fixed clock) | VERIFIED — manual: "Today" label under Fri 8/7 in every schedule screenshot this session |
| Own bookings visually distinguishable from other users' bookings | web schedule grid | 08 | Component test asserting non-color marker (icon/label/pattern) present | VERIFIED — manual: own bookings show a checkmark icon, "You" label, and left-border accent — not color alone |
| Cancellation confirmation via dialog or undo | web cancel flow | 09 | Component test | VERIFIED — manual: every cancellation this session went through a "Cancel this booking? This can't be undone." confirmation dialog |
| Layout must not break at different widths | web responsive layout | 11 | Manual QA at defined breakpoints | VERIFIED — `apps/web/e2e/*.spec.ts` Playwright projects at 390×844 and 430×932 (passing); live viewport resize was unreliable in this session's browser-automation tooling, so this relies on the automated suite plus the Phase 11 manual verification already on record rather than a repeat live resize |
| A full mobile scenario is a bonus | web mobile layout | 11 | Manual QA on phone viewport | VERIFIED — same evidence as above (day chips, snap-scrolling, bottom-sheet forms) |

## Technical requirements

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Language: TypeScript, strict mode | tsconfig (web, api, shared) | 01 | `tsc --noEmit` in CI | VERIFIED — Phase 14 `npm run typecheck` clean |
| Frontend: Next.js/React | apps/web | 01 | Build check | VERIFIED — `apps/web/package.json` |
| Backend: NestJS | apps/api | 01 | Build check | VERIFIED — `apps/api/package.json` |
| Database: PostgreSQL | Prisma schema, docker-compose | 02, 13 | Migration run in CI | VERIFIED — `docker-compose.yml` `db` service + `.github/workflows/ci.yml` integration job |
| Custom schedule grid, no ready-made calendar library | apps/web | 08 | Dependency audit in Phase 14 | VERIFIED — Phase 14 dependency grep, clean |
| Store time in UTC | Prisma schema (timestamptz), shared time helpers | 02, 04 | Unit test on stored vs. displayed values | VERIFIED — `prisma/schema.prisma` (`@db.Timestamptz`), `packages/shared/src/time.spec.ts` |
| Passwords hashed (Argon2id) | api auth | 03 | Unit test (hash format, no plaintext in DB fixture) | VERIFIED — `apps/api/src/auth/password.util.ts` uses `argon2` |
| Seed: rooms | db seed | 02 | Seed script run | VERIFIED — manual: 6 rooms present |
| Seed: two test users, credentials documented in README | db seed, README | 02, 13 | Seed script run + README review | VERIFIED — README.md "Test users" table; manual login as `alice@example.com` |
| Seed: several demo bookings | db seed | 02 | Seed script run | VERIFIED — manual: seeded bookings (Sprint planning, Team Retro, etc.) visible |
| Unit tests for interval-overlap logic: adjacent, partial overlap, full overlap, neighboring days | packages/shared or api | 05 | `npm test` | VERIFIED — `packages/shared/src/time.spec.ts` |
| Unit tests run via `npm test` | root scripts | 01 | CI run | VERIFIED — Phase 14 `npm test`: 248 tests passing |
| Secrets/configuration live in environment variables | api, web env loading | 01, 13 | Code review + `.env.example` diff check | VERIFIED — reviewed in Phase 12/13, re-confirmed this phase |
| Commit `.env.example`, not real secrets | repo root / apps | 01 | Code review, secret-scan in Phase 12 | VERIFIED — Phase 14 `git ls-files` scan found no tracked `.env` files and no secret patterns in tracked content |

## Bonus points

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Dev email confirmation: log verification link, unverified user cannot book | api auth, api booking guard | 03, 05 | Integration test (unverified user create-booking rejected) | VERIFIED — `booking.e2e-spec.ts` "rejects an unverified user with 403"; manual: registered a new account, saw "Email not verified" badge, attempted a booking and was rejected server-side with a clear message |
| Weekly recurring bookings (e.g. every Tuesday × 8), cancel one or the whole series | api recurrence, web recurrence controls | 06, 09 | Integration test (series creation, partial conflict rollback, single/series cancel) | VERIFIED — `apps/api/test/recurrence.e2e-spec.ts`; manual: created a 3-occurrence weekly series live, cancelled one occurrence (series continued), then cancelled the entire remaining series |
| Race-condition protection: concurrent same-slot requests persist exactly one booking, documented in README | DB exclusion constraint, README | 02, 05, 13 | Concurrency test (parallel requests against one slot) | VERIFIED — `apps/api/test/booking-concurrency.e2e-spec.ts`, `series-concurrency.e2e-spec.ts`; documented in README.md's "Race-condition solution" section |
| End-of-booking notifications, N minutes before, exactly once, none if either booking cancelled, N via env | api notifications | 10 | Integration test (idempotency, cancellation suppresses notice) | VERIFIED — `apps/api/test/notifications.e2e-spec.ts` "flags a notification as justDelivered exactly once across repeated polls"; `apps/api/test/db/notification-ending-soon.db-spec.ts`; manual: bell UI renders correctly (empty state) |
| API integration tests: booking creation, cancellation, validation failures | api test suite | 05, 12 | `npm test` (Supertest suite) | VERIFIED — `apps/api/test/`, 89 e2e tests passing as of this phase |
| Capacity filter | api rooms query, web room selector | 04, 07 | Component/integration test | VERIFIED — `apps/api/test/rooms.e2e-spec.ts` "filters by minimum capacity"; manual: filtered by minimum capacity 10, correctly showed only Copenhagen and Edinburgh |
| Full mobile scenario | web responsive/mobile | 11 | Manual QA on phone viewport | VERIFIED — see Interface expectations table above |

## Deliverables

| Requirement | Area | Phase | Verification | Status |
|---|---|---|---|---|
| Meaningful incremental commit history | git log | all | Phase 14 audit review of `git log` | VERIFIED — Phase 14 git-history review: no accidental giant commits, no tracked secrets, no tracked generated artifacts; commit sizes proportionate to their scope |
| README explains how to launch the project | README.md | 13 | Clean-machine launch check | VERIFIED — README.md, rewritten Phase 13 |
| Seed instructions in README | README.md | 13 | Clean-machine launch check | VERIFIED — README.md "Database commands" section |
| Test-user credentials in README | README.md | 02, 13 | Clean-machine launch check | VERIFIED — README.md "Test users" table |
| Implemented bonus points documented | README.md | 13, 14 | Manual review against this matrix | VERIFIED — README.md "Bonus features implemented" section matches this matrix's Bonus points table |
| Short explanation of overlap checking | README.md, `docs/decisions/0001-booking-overlap.md` | 00, 13 | Document review | VERIFIED — README.md "Half-open overlap intervals" section |
| Short explanation of UTC time storage | README.md, `docs/architecture.md` | 00, 13 | Document review | VERIFIED — README.md "UTC storage, Europe/Kyiv office hours, viewer time zone" section |
| Project launches on a clean machine via README only | Docker Compose, README | 13 | Fresh-clone launch rehearsal in Phase 14 | VERIFIED — Phase 13 performed a genuine `docker compose up --build` against the actual Dockerfiles/compose config (not a dry run), including a full login→book→cancel Chrome smoke test against the containerized stack and `docker compose exec api npm run db:seed`; Phase 14 re-validated the compose configuration is still syntactically and structurally correct (`docker compose config`) since no Docker-relevant file changed since |
