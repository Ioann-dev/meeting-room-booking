# Development Roadmap

This file is a readable companion to `docs/development-plan.pdf`.

## Technical direction

- npm workspaces monorepo
- `apps/web`: Next.js + React + strict TypeScript
- `apps/api`: NestJS + strict TypeScript
- `packages/shared`: framework-independent shared types/constants/time helpers
- PostgreSQL + Prisma
- Tailwind CSS
- Radix primitives allowed for generic dialogs/popovers/toasts only
- custom schedule/calendar grid — no ready-made scheduler library
- Luxon or equivalent IANA/DST-safe time handling
- office zone: `Europe/Kyiv`
- booking timestamps stored as UTC instants
- Argon2id password hashing
- opaque database sessions in secure HttpOnly cookies
- Jest + Supertest; Playwright smoke/E2E where appropriate
- Docker Compose + GitHub Actions

## Architecture principles

- Server is authoritative for business/security rules.
- Booking intervals use half-open semantics `[start, end)`.
- Adjacency is valid: one booking may end exactly when another starts.
- Database is the final concurrency authority for overlap prevention.
- Avoid CQRS, event buses, microservices, generic repositories, or other unnecessary enterprise layers.
- No dead code, tutorial commentary, fake data paths, or placeholder implementations in completed phases.
- Every async UI surface has loading, empty, error, and recovery states.
- Ownership must not be communicated by color alone.
- Mobile and keyboard behavior are intentional, not accidental.

## Phase index

| Phase | Area | Target commits |
|---|---|---:|
| 00 | Discovery, requirements, architecture | 2 |
| 01 | Workspace/toolchain | 7 |
| 02 | PostgreSQL/Prisma persistence | 9 |
| 03 | Authentication/email verification | 9 |
| 04 | Rooms/time-zone primitives | 6 |
| 05 | Booking core/race safety | 11 |
| 06 | Weekly recurrence | 9 |
| 07 | Design system/app shell | 7 |
| 08 | Custom weekly grid | 13 |
| 09 | Booking/cancellation UX | 8 |
| 10 | My Bookings/notifications | 8 |
| 11 | Mobile/accessibility | 6 |
| 12 | Integration/security/quality | 8 |
| 13 | Docker/CI/README | 6 |
| 14 | Final release audit | 3 |
| **Total target** |  | **112** |

The commit counts are targets, not permission to manufacture history.
Only make a commit when a real coherent change exists and relevant checks pass.

## Execution rule

Run one phase only, then run the review prompt, fix issues, verify a clean working tree,
and only then start the next phase.
