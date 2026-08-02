# Phase 00 — Discovery, requirement map and engineering contract

**Objective:** Translate the specification into an implementation contract before product code is written.  
**Target:** 2 meaningful commits.

Execute Phase 00 only. Do not build product features.

## Tasks

1. Read the complete participant-facing specification and inspect the current repository.
2. Create `docs/requirements-matrix.md` mapping every mandatory and bonus requirement to:
   - implementation area;
   - planned phase;
   - verification method.
3. Create `docs/architecture.md` covering:
   - monorepo boundaries (`web` / `api` / `shared`);
   - authentication/session approach;
   - UTC and `Europe/Kyiv` time-zone strategy;
   - booking overlap and race-safety strategy;
   - recurring-booking model;
   - notification model;
   - test pyramid;
   - mobile calendar approach;
   - clean-machine launch approach.
4. Create `docs/decisions/0001-booking-overlap.md` explaining:
   - half-open intervals `[start,end)`;
   - why adjacency is valid;
   - why PostgreSQL is the final overlap authority.
5. Create a concise implementation checklist grouped by phases.
6. Record ambiguous details and resolve them conservatively without inventing unnecessary features.
7. Confirm the plan has no admin panel and no ready-made calendar component.

## Acceptance criteria

- Every participant-facing requirement is represented in the matrix.
- Architecture is proportionate to a small challenge project.
- DST handling uses IANA zones.
- Concurrency protection is database-backed, not only a pre-insert SELECT.
- Documents are concise and implementable by another engineer.

## Git

Target two meaningful commits:
1. requirement/architecture documents;
2. ADR/checklist refinement.

## Verify and stop

- `git diff --check`
- `git status`
- report assumptions and open risks
- do not scaffold applications yet
- STOP
