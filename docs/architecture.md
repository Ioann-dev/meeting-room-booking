# Architecture

Concise engineering contract for the meeting-room booking challenge. Proportionate to a
small, single-team project — not an enterprise reference architecture.

## Monorepo boundaries

npm workspaces, three packages:

- **`apps/web`** — Next.js + React, strict TypeScript. Owns all rendering, client-side
  routing, and browser-timezone detection. Talks to `apps/api` over HTTP/JSON only; never
  imports Prisma or server-only code.
- **`apps/api`** — NestJS, strict TypeScript. Owns every business rule: validation, auth,
  office-hours enforcement, overlap prevention, authorization. The only process with a
  database connection.
- **`packages/shared`** — framework-free TypeScript: booking domain types, validation
  constants (slot size, min/max duration, title length, office hours), and pure time-math
  helpers (slot alignment, interval overlap predicate). Consumed by both apps so a rule such
  as "duration is 30 minutes to 4 hours" is defined once and can't drift between client-side
  hinting and server-side enforcement.

No package reaches into another's internals; `web` and `api` only share `packages/shared`
exports. This keeps the boundary a normal import graph — no generic repository layer, no
internal message bus, no service mesh. A three-package split is already the minimum needed
to avoid duplicating domain rules between client and server; nothing more is warranted at
this scale.

## Authentication / session approach

- Registration: name, email, password. Email is canonicalized (trim + lowercase) before
  the uniqueness check and before storage, so `Ivan@x.com` and `ivan@x.com` collide.
- Passwords hashed with Argon2id (memory-hard, current OWASP recommendation); never logged,
  never returned in any response.
- Sessions are opaque random tokens stored in a `Session` database table (id, userId,
  expiresAt, createdAt), issued as an `HttpOnly`, `SameSite=Lax` cookie, `Secure` whenever the
  request arrived over HTTPS. No JWT: an opaque DB-backed session lets us revoke on logout by
  deleting the row, with no token blacklist needed. This matches project scale — a JWT's main
  advantage (stateless verification across services) doesn't apply to a single API process.
- `apps/web` reaches `apps/api` through a same-origin proxy, not a cross-origin fetch: Next.js's
  own `rewrites()` (`next.config.ts`) forward `/api/*` from the web origin to the API service,
  identically in local dev and in the Docker Compose stack — there is no separate reverse-proxy
  service in front of either; `web` is the only hop. The browser therefore never needs a
  cross-site cookie. This is a deliberate simplification, not an oversight — a cross-origin
  `SameSite=None; Secure` cookie would only work over HTTPS, and the challenge's clean-machine
  launch (`docker-compose up`, README-driven, no TLS setup implied) runs over plain HTTP.
  Without same-origin proxying, "session survives page reload" would silently fail on exactly
  the evaluation setup this project is graded on. `SameSite=Lax` plus same-origin is sufficient
  and avoids introducing CORS configuration at all.
- Because `web`'s rewrite is a plain forwarding proxy, not a trust boundary, it neither adds a
  verified `X-Forwarded-For` for every request nor strips a client-supplied one -- a caller can
  set that header to whatever it wants and it reaches `apps/api` unchanged. Anything on the API
  side that needs a trustworthy per-client identity (e.g. rate limiting) cannot rely on
  `req.ip`/`X-Forwarded-For` through this hop; see `AuthThrottlerGuard`'s own comment for how the
  login/register throttle is keyed instead.
- Every request that requires an identity resolves it through a session guard that loads the
  session row and attaches the user; expired/missing sessions are rejected uniformly.
- Optional (bonus) email verification: a verification token table, a logged verification
  link (no real SMTP required in development), and a guard on booking creation that rejects
  unverified users.

## UTC and Europe/Kyiv time-zone strategy

- All instants are stored as UTC (`timestamptz` in Postgres via Prisma). The database and
  API never reason in a local offset.
- The office zone (`Europe/Kyiv`) is a single named constant in `packages/shared`, used only
  for two purposes: (1) converting a user-submitted local date/time into a UTC instant when
  validating "is this inside 09:00–19:00", and (2) rendering the office-zone badge in the UI.
- All time-zone conversions go through Luxon with an IANA zone identifier
  (`Europe/Kyiv`), never a hardcoded UTC+2/+3 offset — this is what keeps DST transitions
  (Kyiv observes EET/EEST) correct without special-casing.
- The browser's IANA zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) drives all
  display formatting on `web`. The server never needs to know the viewer's zone; it only
  emits UTC instants, and `web` converts them for display.
- Working-hours validation always re-derives the Kyiv wall-clock time from the UTC instant
  being validated, server-side. A client cannot smuggle a browser-zone bypass of office
  hours because the server does not trust client-labeled local times — it only trusts the
  UTC instant plus the fixed office zone.

## Booking overlap and race-safety strategy

Summarized fully in `docs/decisions/0001-booking-overlap.md`. In short:

- Intervals are half-open `[start, end)`; adjacency is valid by construction because two
  half-open intervals `[a,b)` and `[b,c)` do not intersect.
- Application code performs the first overlap check for a fast, user-facing error message.
- The database is the final authority: an exclusion constraint (`EXCLUDE USING gist`) over
  `(room_id, tstzrange(start_at, end_at, '[)'), status)` restricted to active bookings makes
  a genuine overlap impossible to persist, even under concurrent requests, without relying
  on application-level locking.

## Recurring-booking model (bonus)

- A `BookingSeries` row records the recurrence rule as office-local wall-clock components
  (`weekday`, `startMinute`, `endMinute`, `occurrenceCount`) plus `ownerId`/`roomId` — not a
  UTC start time — so the rule survives DST regeneration correctly. Each concrete occurrence
  is a normal `Booking` row with a `seriesId` foreign key set to that series.
- The client requests a series by adding a `recurrence: { occurrenceCount }` field to the
  normal create-booking request; the recurring weekday and time-of-day are implied by that
  same request's `startAt`/`endAt` (occurrence 0), matching the spec's "every Tuesday, 8
  occurrences" phrasing without a redundant separate weekday input.
  `occurrenceCount` is bounded 2–52: a single occurrence isn't a recurrence, and the upper
  bound (one year of weekly occurrences) keeps one request from generating an unbounded
  number of rows in a single transaction. `POST /bookings` returns a `BookingSummary` when
  `recurrence` is absent (unchanged Phase 05 behavior) or a `BookingSeriesSummary` — the
  series id, room, occurrence count, and every created occurrence — when it's present; the
  two shapes are structurally distinct (`BookingSeriesSummary` has no top-level `id`), so no
  discriminant field is needed.
- Series creation computes every occurrence's UTC instant by adding weeks to a Luxon
  `DateTime` that is anchored in `Europe/Kyiv`, then converting each resulting local
  wall-clock instant to UTC — never by adding a fixed `7 * 24h` in UTC. The two are not
  equivalent across a Kyiv DST transition (the fixed-duration approach would land 09:00 local
  bookings an hour off local wall-clock time on the far side of the transition); anchoring the
  arithmetic in the office zone and converting per-occurrence is what keeps every occurrence
  at the same office-local time regardless of which side of a transition it falls on. Every
  occurrence is validated with the exact same rules a single booking is (alignment, duration,
  office hours, future) — one shared validator, not a second copy that could drift.
- Overlap protection for a series has the same two layers as a single booking (see below): a
  bounded pre-check across the whole series window using the shared `intervalsOverlap`
  predicate, then the `BookingSeries` row and every occurrence are inserted in one Prisma
  interactive transaction, so a race the pre-check misses still hits the database's exclusion
  constraint and rolls back the entire transaction rather than leaving a partial series. Either
  layer's rejection is a `409 SERIES_CONFLICT` naming the specific occurrence that collided
  (index, office-local date/time) — distinct from the single-booking `BOOKING_CONFLICT`, since
  "occurrence 3 of 8 conflicts" is materially more useful than a generic "this slot is booked"
  for a request that was never about one slot. No partial series is ever persisted: the spec
  describes cancelling one occurrence or the whole series later, not partial creation, and
  silently dropping an occurrence the user asked for would be a worse surprise than a single
  clear "series conflicts on `<date>`" error asking them to adjust and resubmit.
- Cancellation operates at two levels. Cancelling one occurrence needs no series-specific code
  at all: an occurrence is just a `Booking` row with a `seriesId`, so the existing
  `POST /bookings/:id/cancel` already handles it. Cancelling a series
  (`POST /bookings/series/:seriesId/cancel`) soft-cancels every still-active `Booking` with
  that `seriesId` and flips `BookingSeries.status` to `CANCELLED`, both in one transaction so
  an interrupted cancellation can never leave the two inconsistent. Both paths check ownership
  before the idempotent already-cancelled short-circuit, matching single-booking cancellation's
  invariant that a non-owner never learns whether something was already cancelled.

## Notification model (bonus)

- A lightweight scheduled check (not a generic event bus) looks for bookings ending within
  `NOTIFY_BEFORE_MINUTES` whose room has an immediately-following active booking, and that
  have not yet been notified.
- A `notifiedAt` column on the relevant booking makes the check idempotent: once set, the
  same booking is never notified twice, and cancelling either the ending or the following
  booking removes it from the candidate set before the check fires.
- Delivery is in-app only (bell + toast on `web`), backed by a `Notification` row the client
  polls or fetches on load — no external push infrastructure.

## Test pyramid

- **Unit** (`packages/shared`, `apps/api` services): interval overlap/adjacency matrix,
  slot-alignment and duration validators, Kyiv DST conversion cases, password/email
  canonicalization. Fast, no database.
- **Integration** (`apps/api`, Supertest against a real Postgres test database): auth flow,
  booking creation/cancellation/authorization, concurrent-request race behavior, recurrence
  series creation and rollback, notification idempotency.
- **Component** (`apps/web`): form validation display, grid slot rendering, loading/empty/
  error states, ownership styling.
- **E2E smoke** (Playwright, a handful of flows): login → book → see it on the grid → cancel;
  My Bookings deep link into the correct week. Kept small — this is a smoke layer, not a
  parallel copy of the integration suite.

## Mobile calendar approach

The same custom weekly grid is used at every width; there is no separate mobile calendar
component (that would reintroduce exactly the "ready-made scheduler" problem the challenge
forbids, just self-built twice). Below a breakpoint the grid switches to a single active day
with day-chip navigation and horizontal snap-scrolling between days, sticky time rail, and
the booking form presented as a bottom sheet instead of a centered dialog. This is layout and
interaction adaptation of one grid implementation, not a second grid.

## Clean-machine launch approach

- `docker-compose.yml` brings up Postgres (with a persistent volume), the API, and `web` --
  `web`'s own Next.js rewrite forwards `/api/*` to the API service (see the same-origin
  session-cookie decision above; there is no separate reverse-proxy container) — a browser
  hitting one published port gets the whole app. The app processes point at Postgres via `.env`
  (copied from `.env.example`).
- A single documented sequence in `README.md` (install → env copy → migrate → seed → run)
  is rehearsed against a genuinely clean checkout during Phase 14, not assumed to work.
- Seeded seed data (rooms, two test users with credentials in the README, demo bookings) and
  Prisma migrations are the only prerequisites beyond the documented commands — no manual
  database setup steps outside what the README states.
