# REVIEW-PHASE — Senior engineer verification

Use this after a phase has been implemented and before starting the next one.

Replace `<PHASE>` below with the completed phase number.

Review completed **Phase <PHASE>** as a senior full-stack engineer.

## Rules

- Read `CLAUDE.md`.
- Read the completed phase prompt.
- Compare the repository against:
  - the phase acceptance criteria;
  - `docs/original-spec-participant-requirements.md`;
  - existing architecture decisions.
- Do not start the next phase.
- Do not introduce unrelated features.
- Preserve unrelated user changes.

## Inspect for

- incomplete requirements;
- architecture drift;
- TypeScript errors;
- server-side validation gaps;
- authorization bypasses;
- time-zone/DST bugs;
- overlap/adjacency bugs;
- concurrency weaknesses;
- security issues;
- poor error handling;
- UI loading/empty/error gaps;
- accessibility regressions;
- duplicated domain rules;
- dead code;
- unnecessary abstractions;
- unused dependencies;
- debug logging;
- AI/model meta-commentary or tutorial-style comments in production code;
- misleading/fake commit splits.

## Action

1. Run the narrowest relevant tests first.
2. Inspect diffs and implementation directly.
3. Fix every real issue that belongs to the completed phase.
4. Add tests for discovered regressions where appropriate.
5. Run:
   - format;
   - lint;
   - typecheck;
   - relevant tests;
   - `npm test` when practical;
   - affected builds;
   - `git diff --check`;
   - `git status`.
6. Create commits only for real review fixes.

## Return

- phase reviewed;
- issues found;
- fixes made;
- commands executed and exact result;
- commits created;
- remaining risks/manual checks.

Then STOP. Do not begin the next phase.
