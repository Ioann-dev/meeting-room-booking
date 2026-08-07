# Meeting Room Booking

A meeting-room booking application: `apps/web` (Next.js/React), `apps/api` (NestJS), and
`packages/shared` (framework-independent types/constants/time primitives), managed as an npm
workspaces monorepo. Persistence is PostgreSQL via Prisma.

## Prerequisites

- Docker and Docker Compose (quickest launch, and the only thing required for it)
- For the non-Docker path instead: Node.js 20.9+ (`.nvmrc` pins 22, the version used in
  development — run `nvm use` if you have `nvm`), npm 10+, and Docker for Postgres alone

## Quickest launch: Docker Compose

Brings up Postgres, the API, and the web app — no local Node.js install needed.

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:4000 (health check at `/health`)

The `api` container applies pending Prisma migrations automatically on every start, so the
schema is ready as soon as `api` reports healthy. Seed the two test users, six rooms, and demo
bookings once, from the host, after the stack is up:

```bash
docker compose exec api npm run db:seed
```

Change the published ports by setting `WEB_PORT`/`API_PORT` in `.env` (see `.env.example`) if
3000/4000 are already taken locally.

## Non-Docker local launch

```bash
# 1. Install dependencies for every workspace
npm install

# 2. Copy environment templates and adjust if needed
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# 3. Start PostgreSQL only
docker compose up -d db

# 4. Apply migrations and seed demo data
npm run db:migrate:deploy -w apps/api
npm run db:seed -w apps/api

# 5. Start web and API together (with the shared package in watch mode)
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000 (health check at `/health`)

## Environment variables

| File                  | Variable                                                          | Purpose                                                                    |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `.env` (repo root)    | `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`/`POSTGRES_PORT` | Local Postgres container credentials/port                                  |
| `.env` (repo root)    | `API_PORT`/`WEB_PORT`                                             | Host ports published by `docker compose up` (full stack only)              |
| `.env` (repo root)    | `NOTIFY_BEFORE_MINUTES`                                           | Passed to the `api` container in the full Docker Compose stack — see below |
| `apps/api/.env`       | `PORT`                                                            | Port the API listens on (non-Docker launch)                                |
| `apps/api/.env`       | `WEB_ORIGIN`                                                      | Used to build the logged email-verification link                           |
| `apps/api/.env`       | `DATABASE_URL`/`TEST_DATABASE_URL`                                | Postgres connection strings (non-Docker launch)                            |
| `apps/api/.env`       | `NOTIFY_BEFORE_MINUTES`                                           | Same setting as above, for the non-Docker launch                           |
| `apps/web/.env.local` | `API_ORIGIN`                                                      | Where `/api/*` requests are proxied to (non-Docker launch)                 |

Every variable above has a safe default or placeholder in the matching `.env.example` file; no
real secrets are committed anywhere in this repository.

## Test users

Seeded by `npm run db:seed -w apps/api` (or `docker compose exec api npm run db:seed`), and
already email-verified so they're immediately usable without going through the verification
flow:

| Name          | Email             | Password         |
| ------------- | ----------------- | ---------------- |
| Alice Johnson | alice@example.com | AlicePassword123 |
| Bob Smith     | bob@example.com   | BobPassword123   |

New accounts created via the registration page are not verified until the emailed link is
followed, and an unverified user cannot create a booking. There is no real email sending in
development or in the Docker image: the verification link is logged to the API's console
output instead (`docker compose logs api` for the Docker launch).

## Database commands (apps/api)

```bash
npm run db:migrate:dev -w apps/api      # create/apply a migration in development
npm run db:migrate:deploy -w apps/api   # apply pending migrations (no prompts)
npm run db:seed -w apps/api             # (re-)seed rooms, test users, demo bookings
npm run db:reset -w apps/api            # drop, recreate, migrate and seed the dev database
npm run db:studio -w apps/api           # browse the database with Prisma Studio
```

## Tests

```bash
npm test                    # unit tests across every workspace (fast, no database)
npm run test:integration    # API integration tests + real-database constraint tests
                             # (needs `docker compose up -d db` running)
npm run test:e2e -w apps/web  # Playwright smoke tests (needs the dev stack running,
                               # `npm run dev` or the Docker Compose stack)
```

Other root commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run format`,
`npm run format:check`.

## Mandatory features implemented

- **Authentication**: register (name/email/password), login, logout, session persists across
  reload. Email uniqueness is trim + case-insensitive; passwords are 8–72 characters with no
  composition rules, hashed with Argon2id, and never logged or returned by the API.
- **Rooms**: six seeded rooms (name, floor, capacity), no admin panel. Office hours are
  09:00–19:00 in `Europe/Kyiv` for every room.
- **Room schedule**: a manually implemented weekly grid (days horizontal, 30-minute slots
  vertical, no calendar/scheduler library) showing every user's occupied slots with title and
  author, previous/next week navigation.
- **Time zone handling**: all UI times are shown in the viewer's browser time zone, with an
  office-zone notice whenever it differs from `Europe/Kyiv`. Working-hours validation always
  happens in `Europe/Kyiv` server-side, regardless of the viewer's zone.
- **Create booking**: room, date, start/end time, and title; title 1–100 characters, start/end
  aligned to 30-minute boundaries, duration 30 minutes–4 hours, inside office hours, in the
  future, and not overlapping an existing active booking in that room (adjacent bookings, e.g.
  10:00–11:00 and 11:00–12:00, are explicitly valid). All of this is enforced server-side, not
  only in the form, with clear per-reason error messages.
- **Cancellation**: a user may cancel only their own booking — the control isn't rendered for
  others' bookings in the UI, and a direct API call attempting to cancel another user's
  booking is rejected server-side regardless.
- **My Bookings**: an Upcoming section (nearest first, cancel action) and a Past section (most
  recent first, paginated), each row showing date/time/room/title in the viewer's time zone;
  clicking a row deep-links to that booking's room schedule at the correct week.
- **Interface**: a consistent design system across screens, with loading/empty/error states,
  field-level validation errors, disabled submit buttons while a request is in flight, a
  current-day/current-time indicator, a non-color marker distinguishing the viewer's own
  bookings, a cancellation confirmation step, and a responsive layout (including a dedicated
  mobile scenario — day chips, snap-scrolling, bottom-sheet forms).
- **Technical**: TypeScript strict mode throughout; Next.js/React frontend; NestJS backend;
  PostgreSQL via Prisma; all booking timestamps stored as UTC.

## Bonus features implemented

- **Dev email verification**: the verification link is logged to the API's console instead of
  sent by email; an unverified user cannot create a booking.
- **Weekly recurring bookings**: e.g. "every Tuesday, 8 occurrences," with the ability to
  cancel a single occurrence or the whole series; a conflicting occurrence rolls back the
  entire series creation and is reported by name.
- **Race-condition protection**: documented below.
- **End-of-booking notifications**: `NOTIFY_BEFORE_MINUTES` minutes before a booking ends, if
  the same room's next booking starts immediately after — delivered exactly once, suppressed
  entirely if either booking is cancelled first.
- **API integration tests**: a Supertest suite covering booking creation, cancellation,
  validation failures, and authorization, run via `npm run test:integration`.
- **Capacity filter**: room search accepts a minimum-capacity filter.
- **Full mobile scenario**: a dedicated mobile layout, not just a squeezed-down desktop grid.

## Design notes

### Half-open overlap intervals

Every booking is modeled as a half-open interval `[start, end)` — it includes its start
instant and excludes its end instant. Two intervals overlap only if `a1 < b2 AND b1 < a2`;
under that rule, `[10:00, 11:00)` and `[11:00, 12:00)` never overlap, so adjacent bookings are
valid by construction rather than a special-cased exception. Full detail:
[`docs/decisions/0001-booking-overlap.md`](docs/decisions/0001-booking-overlap.md).

### UTC storage, Europe/Kyiv office hours, viewer time zone

Every booking timestamp is stored as a UTC instant (`timestamptz`); the database and API never
reason in a local offset. `Europe/Kyiv` is the single, named office time zone used only to (1)
validate that a submitted instant falls inside 09:00–19:00 office-local time, and (2) render
the office-zone badge. The viewer's own browser time zone
(`Intl.DateTimeFormat().resolvedOptions().timeZone`) drives all other display formatting on the
client; the server never needs to know it. All conversions go through an IANA zone identifier
via Luxon, never a hardcoded UTC offset, so DST transitions (Kyiv observes EET/EEST) stay
correct without special-casing.

### Race-condition solution

An application-level "check, then insert" has a race window: two concurrent requests can both
pass the overlap check before either insert commits. The database is the final authority
instead — a PostgreSQL exclusion constraint (`EXCLUDE USING gist` over `room_id` and the
booking's time range, restricted to active bookings) makes a genuine overlap impossible to
persist even under real concurrency, without any application-level locking. When two requests
race for the same slot, Postgres serializes them and the second fails with a constraint
violation, which the API maps to the same "slot is occupied" response used for the ordinary
case. The fast application-level pre-check still runs first, for a quick, specific error
message in the overwhelmingly common non-concurrent case — the constraint is what makes that
check trustworthy rather than a race condition in disguise. Verified by an integration test
that fires two concurrent create-booking requests at the same slot and asserts exactly one
persists (`apps/api/test/booking-concurrency.e2e-spec.ts`, plus
`series-concurrency.e2e-spec.ts` for the recurring-booking case).

### Notification lead time

`NOTIFY_BEFORE_MINUTES` (default 10) controls how many minutes before a booking ends its owner
is notified, if the same room's immediately next booking is already active. Set it in `.env`
(Docker Compose) or `apps/api/.env` (non-Docker).

## Project layout

```
apps/web       Next.js frontend
apps/api       NestJS backend
packages/shared  Framework-independent types, constants, and time/validation primitives
docs/          Architecture notes and ADRs
prompts/       Phase-by-phase build instructions this project was implemented from
```

## License

© 2026 Ioann Serediuk. All rights reserved. This is a proprietary project; see `LICENSE` for
full terms, including the limited evaluation permission granted to UA-Skills organizers,
reviewers, and evaluators. Third-party dependencies retain their own original licenses — see
`THIRD_PARTY_NOTICES.md`.
