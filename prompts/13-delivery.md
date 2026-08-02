# Phase 13 — Docker Compose, CI, README and clean-machine reproducibility

**Objective:** Package the project so an evaluator can launch it without reading source code.  
**Target:** 6 meaningful commits.

Execute Phase 13 only.

## Docker

1. Create challenge-appropriate multi-stage Dockerfiles for web and API.
2. Create `docker-compose.yml` for PostgreSQL + API + web.
3. Add healthchecks and reliable startup ordering/retry behavior.
4. Document migration + seed workflow.
5. Keep ports/volumes simple and configurable.

## CI

6. Add GitHub Actions for:
   - install;
   - format check;
   - lint;
   - typecheck;
   - unit tests;
   - build.
7. Add integration-test job with PostgreSQL service if stable.

## README

8. Rewrite README for a clean-machine evaluator with:
   - prerequisites;
   - quickest Docker Compose launch;
   - non-Docker local launch;
   - env setup;
   - migrate/seed commands;
   - two seeded test-user credentials;
   - `npm test` and integration/E2E commands;
   - mandatory features implemented;
   - bonus features implemented;
   - half-open overlap explanation;
   - UTC + `Europe/Kyiv` + user-zone explanation;
   - race-condition solution;
   - `NOTIFY_BEFORE_MINUTES`.
9. Ensure `.env.example` contains every required variable with safe placeholders/defaults.
10. Verify no secrets, local database data, build output or editor junk are committed.

## Acceptance criteria

- fresh clone can follow README without source inspection;
- Docker Compose results in a usable app;
- seeded credentials work;
- CI mirrors important local quality gates.

## Verify and stop

Perform a clean-clone simulation in a temporary directory or equivalent. Follow README exactly and fix any missing step. STOP.
