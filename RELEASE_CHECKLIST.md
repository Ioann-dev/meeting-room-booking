# Release Checklist

Phase 14 final acceptance audit, run 2026-08-07 against commit `f1507cd` (HEAD at the start of
this audit; see git log for the audit's own commits on top of it). Full requirement-by-requirement
evidence lives in [`docs/requirements-matrix.md`](docs/requirements-matrix.md) — this file is the
release gate summary: exact commands run, their results, and honest known limitations.

## Automated gate — exact commands and results

All run from the repository root unless noted. All passed; no known test fails.

| Command                              | Result                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run format:check`               | Pass                                                                                                                                                                                                                                                                                                                                                         |
| `npm run lint`                       | Pass (all workspaces)                                                                                                                                                                                                                                                                                                                                        |
| `npm run typecheck`                  | Pass (all workspaces)                                                                                                                                                                                                                                                                                                                                        |
| `npm test`                           | Pass — 248 tests (web: 112/23 suites, api: 69/8 suites, shared: 67/2 suites)                                                                                                                                                                                                                                                                                 |
| `cd apps/api && npm run test:e2e`    | Pass — 89 tests / 10 suites (Supertest, real Postgres test DB)                                                                                                                                                                                                                                                                                               |
| `cd apps/api && npm run test:db`     | Pass — 23 tests / 6 suites (real-DB constraint/consistency suite)                                                                                                                                                                                                                                                                                            |
| `cd apps/api && npx prisma validate` | Pass — schema valid                                                                                                                                                                                                                                                                                                                                          |
| `cd apps/web && npm run test:e2e`    | Pass — 15 tests (Playwright: Desktop Chrome, Mobile 390×844, Mobile 430 — a11y scans + full login→book→deep-link→cancel flow, each project)                                                                                                                                                                                                                  |
| `npm run build`                      | Pass — shared → api (`nest build`) → web (`next build`), no errors                                                                                                                                                                                                                                                                                           |
| `docker compose config -q`           | Pass — compose file valid. Dockerfiles present (`apps/api/Dockerfile`, `apps/web/Dockerfile`); not rebuilt this phase since Phase 13 already performed a genuine `docker compose up --build` (full stack: db + api + web), including a live login→book→cancel Chrome smoke test against the containerized app, and no Docker-relevant file has changed since |
| `npm audit`                          | 3 known high-severity findings (`postcss`, `sharp`, both transitive via `next`) — unchanged since Phase 12, no new findings; see "Accepted risks" below                                                                                                                                                                                                      |
| `git diff --check`                   | Pass — no whitespace/line-ending issues                                                                                                                                                                                                                                                                                                                      |
| `git status`                         | Clean except this audit's own changes                                                                                                                                                                                                                                                                                                                        |

Total automated test count: **248 unit/integration tests + 89 API e2e tests + 23 DB tests + 15
Playwright e2e tests = 375 automated checks, all passing** as of this audit.

## Manual acceptance (two users: Alice Johnson / Bob Smith, plus one fresh registration)

Performed live against the running dev stack in Chrome. Every item below was directly observed,
not inferred:

- Registration (mixed-case email normalized), immediate authenticated session — pass
- Verification gate: unverified user's booking attempt shown a client warning _and_ rejected
  server-side with the same clear message — pass
- Login / logout — pass
- Capacity filter (minimum 10 → correctly narrowed to Copenhagen/Edinburgh) — pass
- Week navigation (forward across 3 weeks and back) — pass
- Foreign booking visible with title + author (Bob's "Team Retro" seen while logged in as
  Alice), and shows no cancel control at all — pass
- Valid booking creation, with the confirmation toast correctly converted to the viewer's
  (Berlin) time zone — pass
- Overlap rejected with a clear message; adjacent booking accepted immediately after — pass
- My Bookings: Upcoming (nearest-first), Past (most-recent-first, cancelled items marked with
  a non-color indicator, pagination-end marker present), deep link back to the correct
  room/week — pass
- Own cancellation via confirmation dialog — pass
- Recurring booking: created a 3-occurrence weekly series, cancelled a single occurrence (series
  continued), then cancelled the entire remaining series — pass
- Notification bell renders correctly (empty state); exactly-once/cancellation-suppression
  behavior verified by `apps/api/test/notifications.e2e-spec.ts` rather than a live timing-based
  demo (would require waiting out a real N-minute window to observe honestly)
- Concurrent same-slot race: verified by `booking-concurrency.e2e-spec.ts` /
  `series-concurrency.e2e-spec.ts` (exactly one persists), not manually reproducible via two
  browser clicks
- Mobile/responsive: Playwright's 390×844 and 430×932 projects pass; live viewport resize was
  unreliable in this session's browser-automation tooling (a known limitation of the tool, not
  the app), so this relies on the automated suite and the Phase 11 manual verification already
  on record rather than a repeat live resize this session
- Console/network: no application errors; all `/api/*` requests observed returned 2xx

## Dependency/security audit

- `npm audit`: 3 high-severity findings, all transitive through `next`'s bundled `postcss`/
  `sharp`, with no patch-level fix available. Documented and accepted in
  [`docs/decisions/0002-dependency-audit.md`](docs/decisions/0002-dependency-audit.md): neither
  vulnerable code path is reachable by this app (no user-supplied CSS, no image
  upload/processing). Not forced this phase either, per instruction and because nothing new
  makes either path reachable.
- No ready-made calendar/scheduler library in any `package.json` (grepped for FullCalendar,
  react-big-calendar, DayPilot, Bryntum, Syncfusion/DevExtreme scheduler components — none
  found).
- No secrets, real `.env` files, database data, build output, or editor/OS junk tracked in git
  (`git ls-files` scan).
- Git history reviewed for accidental giant commits, secrets, and generated artifacts: none
  found. Largest commits are proportionate to their scope (the biggest is the original
  requirements-matrix documentation commit, 26 files / 1895 insertions — a planning document, not
  code).

## Known limitations (honest, non-critical)

- Live mobile-viewport resize could not be exercised directly in this session's Chrome
  automation tool (a tooling limitation observed and noted, not an app defect); mobile behavior
  is covered by the automated Playwright mobile projects and Phase 11's own manual verification.
- The end-of-booking notification's exact-once/cancellation-suppression behavior and the
  concurrent-booking race are proven by automated integration tests rather than a live manual
  demo, since both require conditions (a real N-minute wait; two genuinely simultaneous requests)
  that a single manual click-through cannot honestly reproduce better than the existing tests
  already do.
- The 3 `npm audit` findings (transitive `postcss`/`sharp` via `next`) remain open by deliberate,
  documented decision — see `docs/decisions/0002-dependency-audit.md`.
- Docker Compose was not rebuilt from scratch during this phase (Phase 13 already did a full
  build + run + live smoke test); this phase only re-validated the compose configuration itself.

## Recommended evaluator demo script

1. `cp .env.example .env && docker compose up --build` (or the non-Docker path in README.md).
2. Open http://localhost:3000, log in as `alice@example.com` / `AlicePassword123`.
3. Open the Athens room schedule — note Bob Smith's visible booking, the current-day indicator,
   and your own bookings' distinct styling.
4. Book a free slot on a future day; note the confirmation toast in your browser's own time
   zone if it differs from Europe/Kyiv.
5. Attempt to book directly over that same slot — see the clear rejection message; then book the
   slot immediately adjacent to it — see it succeed.
6. Go to My Bookings, cancel the booking via the confirmation dialog, then check the Past tab.
7. Book a weekly-recurring series (check "Repeat weekly"), cancel a single occurrence, then
   cancel the remaining series from any occurrence's detail dialog.
8. Register a second, new account and try to book a room before verifying its email — see the
   gate reject it; then check the API's console output for the logged verification link.
9. Try the mobile view (390px or narrower) to see the day-chip/snap-scroll schedule and
   bottom-sheet booking form.
