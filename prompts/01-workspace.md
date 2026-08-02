# Phase 01 — Workspace, toolchain and local developer experience

**Objective:** Create a clean strict-TypeScript monorepo that can run web and API applications.  
**Target:** 7 meaningful commits.

Execute Phase 01 only.

## Tasks

1. Initialize npm workspaces:
   - `apps/web` — Next.js + React + TypeScript;
   - `apps/api` — NestJS + TypeScript;
   - `packages/shared` — framework-independent types/constants/time primitives.
2. Use a supported Node LTS and pin it with `.nvmrc` or `.node-version` plus `package.json` engines.
3. Configure strict TypeScript, ESLint and Prettier consistently.
4. Add root scripts:
   - `dev`
   - `build`
   - `lint`
   - `typecheck`
   - `test`
   - `test:integration`
   - `format`
   - `format:check`
5. Make root `npm test` valid from the start.
6. Add a root dev runner that starts web and API together without hiding logs.
7. Add environment loading and `.env.example` placeholders without secrets.
8. Add:
   - API `GET /health`;
   - a minimal web shell that verifies API connectivity.
9. Add basic web error/not-found behavior.
10. Update README with bootstrap commands only.

## Quality rules

- no routine `any`;
- no unnecessary framework code in shared package;
- remove unused starter/demo boilerplate;
- do not add calendar packages.

## Acceptance criteria

- root `npm install` succeeds;
- `npm run dev` starts both apps;
- `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` pass;
- web can show API health/connectivity.

## Verify and stop

Run all acceptance commands, summarize results and commits, then STOP.
