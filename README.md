# Meeting Room Booking

A meeting-room booking application: `apps/web` (Next.js), `apps/api` (NestJS), and
`packages/shared` (framework-independent types/constants/time primitives), managed as an
npm workspaces monorepo.

This README currently covers local bootstrap only. Database setup, seeding, test-user
credentials, architecture notes, and deployment instructions will be added as those parts
of the project are built.

## Prerequisites

- Node.js 20.9+ (LTS; `.nvmrc` pins the version used in development — run `nvm use` if you
  have `nvm` installed)
- npm 10+

## Bootstrap

```bash
# 1. Install dependencies for every workspace
npm install

# 2. Copy environment templates and adjust if needed
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local

# 3. Start web and API together (with the shared package in watch mode)
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000 (health check at `/health`)

## Other root commands

```bash
npm run build        # build shared, then api, then web
npm run lint          # lint every workspace
npm run typecheck     # typecheck every workspace
npm test              # unit tests across workspaces
npm run test:integration  # API integration (e2e) tests
npm run format         # format the repo with Prettier
npm run format:check   # check formatting without writing
```
