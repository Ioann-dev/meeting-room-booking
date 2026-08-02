# Requirements Matrix

Maps every participant-facing requirement from `docs/original-spec-participant-requirements.md`
to its implementation area, planned phase, and verification method.

Phase numbers refer to `prompts/NN-*.md`. "Manual QA" means a scripted check performed during
Phase 14 release audit against the running application; it is not a substitute for automated
coverage where automated coverage is feasible.

## Authentication

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| Registration collects name, email, password | api auth, web auth screens | 03, 09→07 UI polish | Integration test (Supertest) + manual QA |
| Email unique after trim + case-insensitive compare | api auth (DB constraint + service check) | 02 (constraint), 03 (service) | Unit test on canonicalization + integration test on duplicate registration |
| Name must be non-empty | api auth DTO validation | 03 | Unit test (DTO validator) |
| Name displayed as booking author in schedule | web schedule grid | 08 | Component/E2E check |
| Names need not be unique | api auth (no uniqueness constraint on name) | 02, 03 | Integration test (two users, same name) |
| Password length 8–72 chars, no composition rules | api auth DTO validation | 03 | Unit test (boundary values 7/8/72/73) |
| Server-side validation is authoritative | api auth, api booking | 03, 05 | Integration test bypassing client (direct API calls) |
| Validation failures shown with clear messages | web auth forms | 07/09 | Manual QA + component test |
| Login | api auth, web auth screen | 03 | Integration test + manual QA |
| Logout | api auth, web auth screen | 03 | Integration test (session revoked after logout) |
| Session survives page reload | web session bootstrap, api session cookie | 03 | Playwright smoke test |

## Rooms

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| Seed 5–6 rooms with name, floor, capacity | db seed | 02 | Seed script run + assertion in seed test |
| No admin panel | (absence of feature) | all | Code review checklist item in Phase 14 audit |
| Office hours 09:00–19:00, Europe/Kyiv, for all rooms | shared time constants | 04 | Unit test on office-hours constant usage |

## Room schedule

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| Weekly grid: days horizontal, time vertical, 30-min slots | web custom grid | 08 | Component test on slot generation |
| Occupied slots visible to everyone | api schedule query, web grid render | 05, 08 | Integration test (unauthenticated-to-own-room visibility of other users' bookings) |
| Occupied slot shows title + author | web grid render | 08 | Component test |
| Previous/next week navigation | web schedule URL state | 08 | Component/E2E test |
| Grid implemented by the project, no ready-made scheduler library | web custom grid | 08 | Code review checklist item (no FullCalendar/RBC/DayPilot/Scheduler dependency) |

## User time zone

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| All UI times shown in browser time zone | web time display | 04, 08 | Unit test (fixed offset fixtures) + manual QA in a non-Kyiv browser zone |
| Office-zone notice when user zone differs | web schedule header | 08 | Component test (zone mismatch renders badge) |
| Working-hours validation always in Europe/Kyiv | api booking validation | 04, 05 | Unit test across DST transition dates |

## Create booking

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| Room, date, start time, end time, title inputs | web booking form | 09 | Component test |
| Title required, 1–100 chars | shared validation, api DTO | 05 | Unit test (boundary values) |
| Start/end align to 30-minute boundaries | shared validation, api DTO | 05 | Unit test |
| Duration 30 min–4 h | shared validation, api DTO | 05 | Unit test (boundary values) |
| Booking only inside office working hours | api booking service | 05 | Unit + integration test |
| Booking only in the future | api booking service | 05 | Unit test (fixed clock) |
| Booking may not overlap an existing booking | api booking service + DB constraint | 02, 05 | Unit test (interval overlap matrix) + integration test |
| Adjacent bookings are valid (e.g. 10:00–11:00 and 11:00–12:00) | shared interval logic, DB constraint | 02, 05 | Unit test (adjacency case) |

## Errors

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| Clear message for occupied slot / outside hours / past time | api error mapping, web error display | 05, 09 | Integration test on each rejection reason + manual QA |
| Server enforces rules, not only the form | api booking service | 05 | Integration test calling API directly with invalid payloads |

## Cancellation

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| User may cancel own booking | api booking service, web cancel action | 05, 09 | Integration test + manual QA |
| Another user's booking is not cancellable via UI | web cancel action (no control rendered) | 09 | Component test |
| Another user's booking is not cancellable via direct API request | api authorization guard | 05 | Integration test (cross-user cancel attempt returns 403/404) |

## My Bookings

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| Upcoming section, nearest first, cancel button | api my-bookings query, web page | 10 | Integration test (ordering) + component test |
| Past section, most recent first, pagination/load-more | api my-bookings query, web page | 10 | Integration test (ordering + pagination) |
| Row shows date, time, room, title | web my-bookings list | 10 | Component test |
| Time shown in user's time zone | web my-bookings list | 10 | Component test (fixed offset fixture) |
| Clicking a booking navigates to room schedule at the correct week | web navigation | 10 | E2E test (Playwright) |

## Interface expectations

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| Consistent spacing/typography/colors across screens | design tokens, shared UI primitives | 07 | Visual/manual QA |
| Loading states | all async screens | 07–10 | Component test per screen |
| Empty states | schedule, my-bookings | 08, 10 | Component test |
| Error states, no blank page/infinite spinner when server unavailable | app shell, data-fetch layer | 07 | Component test (forced fetch failure) |
| Field errors shown close to fields | web forms | 07/09 | Component test |
| Submit buttons disabled while request runs | web forms | 09 | Component test |
| Current day/current time highlighted | web schedule grid | 08 | Component test (fixed clock) |
| Own bookings visually distinct, not by color alone | web schedule grid | 08 | Component test asserting non-color marker (icon/label/pattern) present |
| Cancellation confirmation (dialog or undo) | web cancel flow | 09 | Component test |
| Layout does not break at different widths | web responsive layout | 11 | Manual QA at defined breakpoints |
| Full mobile scenario (bonus) | web mobile layout | 11 | Manual QA on phone viewport |

## Technical requirements

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| TypeScript throughout, strict mode | tsconfig (web, api, shared) | 01 | `tsc --noEmit` in CI |
| Frontend: Next.js/React | apps/web | 01 | Build check |
| Backend: NestJS | apps/api | 01 | Build check |
| Database: PostgreSQL | Prisma schema, docker-compose | 02, 13 | Migration run in CI |
| Custom schedule grid, no ready-made calendar library | apps/web | 08 | Dependency audit in Phase 14 |
| Store time in UTC | Prisma schema (timestamptz), shared time helpers | 02, 04 | Unit test on stored vs. displayed values |
| Passwords hashed (Argon2id) | api auth | 03 | Unit test (hash format, no plaintext in DB fixture) |
| Seed: rooms | db seed | 02 | Seed script run |
| Seed: two test users, credentials documented in README | db seed, README | 02, 13 | Seed script run + README review |
| Seed: several demo bookings | db seed | 02 | Seed script run |
| Unit tests for interval-overlap: adjacent, partial overlap, full overlap, neighboring days | packages/shared or api | 05 | `npm test` |
| Unit tests run via `npm test` | root scripts | 01 | CI run |
| Secrets/config via environment variables | api, web env loading | 01, 13 | Code review + `.env.example` diff check |
| `.env.example` committed, not real secrets | repo root / apps | 01 | Code review, secret-scan in Phase 12 |

## Bonus points

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| Dev email confirmation: log verification link, unverified user cannot book | api auth, api booking guard | 03, 05 | Integration test (unverified user create-booking rejected) |
| Weekly recurring bookings (e.g. every Tuesday × 8), cancel one or whole series | api recurrence, web recurrence controls | 06, 09 | Integration test (series creation, partial conflict rollback, single/series cancel) |
| Race-condition protection: concurrent same-slot requests persist exactly one booking, documented in README | DB exclusion constraint, README | 02, 05, 13 | Concurrency test (parallel requests against one slot) |
| End-of-booking notifications, N minutes before, exactly once, none if either booking cancelled, N via env | api notifications | 10 | Integration test (idempotency, cancellation suppresses notice) |
| API integration tests: booking creation, cancellation, validation failures | api test suite | 05, 12 | `npm test` (Supertest suite) |
| Capacity filter | api rooms query, web room selector | 04, 07 | Component/integration test |
| Full mobile scenario | web responsive/mobile | 11 | Manual QA on phone viewport |

## Deliverables

| Requirement | Area | Phase | Verification |
|---|---|---|---|
| Meaningful incremental commit history | git log | all | Phase 14 audit review of `git log` |
| README explains how to launch the project | README.md | 13 | Clean-machine launch check |
| Seed instructions in README | README.md | 13 | Clean-machine launch check |
| Test-user credentials in README | README.md | 02, 13 | Clean-machine launch check |
| Implemented bonus points documented | README.md | 13, 14 | Manual review against this matrix |
| Short explanation of overlap checking | README.md, `docs/decisions/0001-booking-overlap.md` | 00, 13 | Document review |
| Short explanation of UTC time storage | README.md, `docs/architecture.md` | 00, 13 | Document review |
| Project launches on a clean machine via README only | Docker Compose, README | 13 | Fresh-clone launch rehearsal in Phase 14 |
