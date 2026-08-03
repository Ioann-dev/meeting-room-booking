# Meeting Room Booking

A meeting-room booking application: `apps/web` (Next.js), `apps/api` (NestJS), and
`packages/shared` (framework-independent types/constants/time primitives), managed as an
npm workspaces monorepo. Persistence is PostgreSQL via Prisma.

This README currently covers local bootstrap, database setup and seeding. Architecture
notes and deployment instructions will be added as those parts of the project are built.

## Prerequisites

- Node.js 20.9+ (LTS; `.nvmrc` pins the version used in development — run `nvm use` if you
  have `nvm` installed)
- npm 10+
- Docker (for local PostgreSQL)

## Bootstrap

```bash
# 1. Install dependencies for every workspace
npm install

# 2. Copy environment templates and adjust if needed
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# 3. Start PostgreSQL
docker compose up -d db

# 4. Apply migrations and seed demo data
npm run db:migrate:deploy -w apps/api
npm run db:seed -w apps/api

# 5. Start web and API together (with the shared package in watch mode)
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000 (health check at `/health`)

## Test users

Seeded by `npm run db:seed -w apps/api`:

| Name          | Email             | Password         |
| ------------- | ----------------- | ---------------- |
| Alice Johnson | alice@example.com | AlicePassword123 |
| Bob Smith     | bob@example.com   | BobPassword123   |

## Database commands (apps/api)

```bash
npm run db:migrate:dev -w apps/api      # create/apply a migration in development
npm run db:migrate:deploy -w apps/api   # apply pending migrations (no prompts)
npm run db:seed -w apps/api             # (re-)seed rooms, test users, demo bookings
npm run db:reset -w apps/api            # drop, recreate, migrate and seed the dev database
npm run db:studio -w apps/api           # browse the database with Prisma Studio
```

## Other root commands

```bash
npm run build        # build shared, then api, then web
npm run lint          # lint every workspace
npm run typecheck     # typecheck every workspace
npm test              # unit tests across workspaces
npm run test:integration  # API e2e tests + database constraint tests (needs docker compose db running)
npm run format         # format the repo with Prettier
npm run format:check   # check formatting without writing
```
